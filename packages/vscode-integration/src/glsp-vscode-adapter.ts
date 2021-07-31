/********************************************************************************
 * Copyright (c) 2021 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as vscode from 'vscode';
import * as fs from 'fs';

import {
    isActionMessage,
    SaveModelAction,
    RequestModelAction,
    SetDirtyStateAction,
    DirtyStateChangeReason,
    UndoOperation,
    RedoOperation,
    SetMarkersAction,
    NavigateToExternalTargetAction,
    SelectAction,
    ExportSvgAction
} from './actions';

export interface GlspDiagramDocument extends vscode.CustomDocument {
    readonly onSaveDocumentEvent: vscode.Event<{ cancellation: vscode.CancellationToken }>;
    readonly onSaveDocumentAsEvent: vscode.Event<{ destination: vscode.Uri; cancellation: vscode.CancellationToken }>;
    readonly onRevertDocumentEvent: vscode.Event<{ cancellation: vscode.CancellationToken; diagramType: string }>;
    readonly onBackupDocumentEvent: vscode.Event<{ context: vscode.CustomDocumentBackupContext; cancellation: vscode.CancellationToken }>;
    readonly onDocumentSavedEventEmitter: vscode.EventEmitter<void>;
}

export interface GlspClientWrapper {
    readonly clientId: string;
    readonly webviewPanel: vscode.WebviewPanel;
    readonly document: GlspDiagramDocument;
    readonly onDidChangeCustomDocumentEventEmitter: vscode.EventEmitter<vscode.CustomDocumentEditEvent<GlspDiagramDocument>>;
    readonly onClientRecieveEmitter: vscode.EventEmitter<unknown>;
    readonly onClientSend: vscode.Event<unknown>;
}

export interface GlspServerWrapper {
    readonly onServerRecieveEmitter: vscode.EventEmitter<unknown>;
    readonly onServerSend: vscode.Event<unknown>;
}

export interface GlspVscodeAdapterConfiguration {
    server: GlspServerWrapper;
    logging?: boolean;
    onBeforeRecieveMessageFromClient?: (
        message: unknown,
        callback: (newMessage: unknown | undefined, shouldBeProcessedByAdapter?: boolean) => void
    ) => void;
    onBeforeRecieveMessageFromServer?: (
        message: unknown,
        callback: (newMessage: unknown | undefined, shouldBeProcessedByAdapter?: boolean) => void
    ) => void;
    onBeforePropagateMessageToServer?: (originalMessage: unknown, processedMessage: unknown, messageChanged: boolean) => unknown | undefined;
    onBeforePropagateMessageToClient?: (originalMessage: unknown, processedMessage: unknown, messageChanged: boolean) => unknown | undefined;
}

export class GlspVscodeAdapter implements vscode.Disposable {
    private readonly options: Required<GlspVscodeAdapterConfiguration>;
    private readonly clientMap = new Map<string, GlspClientWrapper>();
    private readonly clientSelectionMap = new Map<string, string[]>();
    private readonly diagnostics = vscode.languages.createDiagnosticCollection();
    private readonly selectionUpdateEmitter = new vscode.EventEmitter<string[]>();
    private readonly disposables: vscode.Disposable[] = [];

    onSelectionUpdate: vscode.Event<string[]>;

    constructor(options: GlspVscodeAdapterConfiguration) {
        // Create default options
        this.options = {
            logging: false,
            onBeforeRecieveMessageFromClient: (message, callback) => {
                callback(message, true);
            },
            onBeforeRecieveMessageFromServer: (message, callback) => {
                callback(message, true);
            },
            onBeforePropagateMessageToClient: (originalMessage, processedMessage) => processedMessage,
            onBeforePropagateMessageToServer: (originalMessage, processedMessage) => processedMessage,
            ...options
        };

        this.onSelectionUpdate = this.selectionUpdateEmitter.event;

        const serverMessageListener = this.options.server.onServerSend(message => {
            if (this.options.logging) {
                if (isActionMessage(message)) {
                    console.log(`Server (${message.clientId}): ${message.action.kind}`, message.action);
                } else {
                    console.log('Server (no action message):', message);
                }
            }

            this.options.onBeforeRecieveMessageFromServer(message, (newMessage, shouldBeProcessedByAdapter) => {
                if (shouldBeProcessedByAdapter) {
                    this.processMessage(newMessage, 'server', (processedMessage, messageChanged) => {
                        const filteredMessage = this.options.onBeforePropagateMessageToClient(newMessage, processedMessage, messageChanged);
                        if (typeof filteredMessage !== 'undefined' && isActionMessage(filteredMessage)) {
                            this.sendMessageToClient(filteredMessage.clientId, filteredMessage);
                        }
                    });
                } else {
                    const filteredMessage = this.options.onBeforePropagateMessageToClient(newMessage, newMessage, false);
                    if (typeof filteredMessage !== 'undefined' && isActionMessage(filteredMessage)) {
                        this.sendMessageToClient(filteredMessage.clientId, filteredMessage);
                    }
                }
            });
        });

        this.disposables.push(
            this.diagnostics,
            this.selectionUpdateEmitter,
            serverMessageListener
        );
    }

    registerClient(client: GlspClientWrapper): void {
        this.clientMap.set(client.clientId, client);

        const clientMessageListener = client.onClientSend(message => {
            if (this.options.logging) {
                if (isActionMessage(message)) {
                    console.log(`Client (${message.clientId}): ${message.action.kind}`, message.action);
                } else {
                    console.log('Client (no action message):', message);
                }
            }

            this.options.onBeforeRecieveMessageFromClient(message, (newMessage, shouldBeProcessedByAdapter) => {
                if (shouldBeProcessedByAdapter) {
                    this.processMessage(newMessage, 'client', (processedMessage, messageChanged) => {
                        const filteredMessage = this.options.onBeforePropagateMessageToServer(newMessage, processedMessage, messageChanged);
                        if (typeof filteredMessage !== 'undefined') {
                            this.options.server.onServerRecieveEmitter.fire(filteredMessage);
                        }
                    });
                } else {
                    const filteredMessage = this.options.onBeforePropagateMessageToServer(newMessage, newMessage, false);
                    if (typeof filteredMessage !== 'undefined') {
                        this.options.server.onServerRecieveEmitter.fire(filteredMessage);
                    }
                }
            });
        });

        const viewStateListener = client.webviewPanel.onDidChangeViewState(e => {
            if (e.webviewPanel.active) {
                this.selectionUpdateEmitter.fire(this.clientSelectionMap.get(client.clientId) || []);
            }
        });

        const onSaveListener = client.document.onSaveDocumentEvent(() => {
            this.sendActionToClient(client.clientId, new SaveModelAction());
        });

        const onSaveAsListener = client.document.onSaveDocumentAsEvent(({ destination }) => {
            this.sendActionToClient(client.clientId, new SaveModelAction(destination.path));
        });

        const onRevertListener = client.document.onRevertDocumentEvent(({ diagramType }) => {
            this.sendActionToClient(client.clientId, new RequestModelAction({
                sourceUri: client.document.uri.toString(),
                diagramType: diagramType
            }));
        });

        const panelOnDisposeListener = client.webviewPanel.onDidDispose(() => {
            this.diagnostics.set(client.document.uri, undefined); // this clears the diagnostics for the file
            this.clientMap.delete(client.clientId);
            this.clientSelectionMap.delete(client.clientId);
            viewStateListener.dispose();
            clientMessageListener.dispose();
            onSaveListener.dispose();
            onSaveAsListener.dispose();
            onRevertListener.dispose();
            panelOnDisposeListener.dispose();
        });
    }

    sendActionToActiveClient(action: unknown): void {
        this.clientMap.forEach(client => {
            if (client.webviewPanel.active) {
                client.onClientRecieveEmitter.fire({
                    clientId: client.clientId,
                    action: action,
                    __localDispatch: true
                });
            }
        });
    }

    private sendMessageToClient(clientId: string, message: unknown): void {
        const client = this.clientMap.get(clientId);
        if (client) {
            client.onClientRecieveEmitter.fire(message);
        }
    }

    private sendActionToClient(clientId: string, action: unknown): void {
        this.sendMessageToClient(clientId, {
            clientId: clientId,
            action: action,
            __localDispatch: true
        });
    }

    private processMessage(
        message: unknown, origin: 'client' | 'server',
        callback: (newMessage: unknown, messageChanged: boolean) => void
    ): void {
        if (isActionMessage(message)) {
            const client = this.clientMap.get(message.clientId);
            const action = message.action;

            // Dirty state & save actions
            if (client && SetDirtyStateAction.is(action)) {
                const reason = action.reason || '';
                if (reason === DirtyStateChangeReason.SAVE) {
                    client.document.onDocumentSavedEventEmitter.fire();
                } else if (reason === DirtyStateChangeReason.OPERATION && action.isDirty) {
                    client.onDidChangeCustomDocumentEventEmitter.fire({
                        document: client.document,
                        undo: () => {
                            this.sendActionToClient(client.clientId, new UndoOperation());
                        },
                        redo: () => {
                            this.sendActionToClient(client.clientId, new RedoOperation());
                        }
                    });
                }
            }

            // Diagnostic actions
            if (client && SetMarkersAction.is(action)) {
                const SEVERITY_MAP = {
                    'info': 2,
                    'warning': 1,
                    'error': 0
                };

                const updatedDiagnostics = action.markers.map(marker => new vscode.Diagnostic(
                    new vscode.Range(0, 0, 0, 0), // Must have be defined as such - no workarounds
                    marker.description,
                    SEVERITY_MAP[marker.kind]
                ));

                this.diagnostics.set(client.document.uri, updatedDiagnostics);
            }

            // External targets action
            if (NavigateToExternalTargetAction.is(action)) {
                const SHOW_OPTIONS = 'jsonOpenerOptions';
                const { uri, args } = action.target;
                let showOptions = { ...args };

                // Give server the possibility to provide options through the `showOptions` field by providing a
                // stringified version of the `TextDocumentShowOptions`
                // See: https://code.visualstudio.com/api/references/vscode-api#TextDocumentShowOptions
                const showOptionsField = args?.[SHOW_OPTIONS];
                if (showOptionsField) {
                    showOptions = { ...args, ...(JSON.parse(showOptionsField.toString())) };
                }

                vscode.window.showTextDocument(vscode.Uri.parse(uri), showOptions)
                    .then(
                        () => undefined, // onFulfilled: Do nothing.
                        () => undefined // onRejected: Do nothing - This is needed as error handling in case the navigationTarget does not exist.
                    );

                // Do not propagate action
                return callback(undefined, true);
            }

            // Selection action
            if (client && SelectAction.is(action)) {
                this.clientSelectionMap.set(client.clientId, action.selectedElementsIDs);
                this.selectionUpdateEmitter.fire(action.selectedElementsIDs);

                if (origin === 'client') {
                    // Do not propagate action if it comes from client in order to avoid an infinite loop as both, client and server will mirror this action
                    return callback(undefined, true);
                }
            }

            // Export SVG action
            if (ExportSvgAction.is(action)) {
                vscode.window.showSaveDialog({
                    filters: { 'SVG': ['svg'] },
                    saveLabel: 'Export',
                    title: 'Export as SVG'
                }).then(
                    (uri: vscode.Uri | undefined) => {
                        if (uri) {
                            fs.writeFile(uri.fsPath, action.svg, { encoding: 'utf-8' }, err => {
                                if (err) {
                                    console.error(err);
                                }
                            });
                        }
                    },
                    console.error
                );

                // Do not propagate action if it comes from client in order to avoid an infinite loop as both, client and server will mirror this action
                return callback(undefined, true);
            }
        }

        return callback(message, false);
    }

    dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
    }
}
