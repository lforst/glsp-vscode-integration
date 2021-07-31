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
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.01
 ********************************************************************************/

import * as vscode from 'vscode';
import * as path from 'path';
import WorkflowDocument from './workflow-document';
import { GlspVscodeAdapter } from '@eclipse-glsp/vscode-integration';
import { isActionMessage, isWebviewReadyMessage } from 'sprotty-vscode-protocol';

const DIAGRAM_TYPE = 'workflow-diagram';

export class WorkflowEditorProvider implements vscode.CustomEditorProvider<WorkflowDocument> {
    private readonly onDidChangeCustomDocumentEventEmitter = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<WorkflowDocument>>();
    onDidChangeCustomDocument: vscode.Event<vscode.CustomDocumentEditEvent<WorkflowDocument>>;

    // This is used to generate continuous and unique clientIds - consider replacing this with uuid4
    private viewCount = 0;

    // This variable is used to keep track of which editor panel has reign over the 'workflow-editor-focused' status
    private focusedEditorPanelClientId?: string = undefined;

    constructor(
        private readonly extensionContext: vscode.ExtensionContext,
        private readonly vscodeAdapter: GlspVscodeAdapter
    ) {
        this.onDidChangeCustomDocument = this.onDidChangeCustomDocumentEventEmitter.event;
    }

    saveCustomDocument(document: WorkflowDocument, cancellation: vscode.CancellationToken): Thenable<void> {
        const savePromise = new Promise(resolve => {
            const saveListener = document.onDocumentSavedEventEmitter.event(() => {
                resolve();
                saveListener.dispose();
            });
        });
        document.onSaveDocumentEventEmitter.fire({ cancellation });
        return savePromise;
    }

    saveCustomDocumentAs(document: WorkflowDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
        const savePromise = new Promise(resolve => {
            const saveListener = document.onDocumentSavedEventEmitter.event(() => {
                resolve();
                saveListener.dispose();
            });
        });
        document.onSaveDocumentAsEventEmitter.fire({ destination, cancellation });
        return savePromise;
    }

    revertCustomDocument(document: WorkflowDocument, cancellation: vscode.CancellationToken): Thenable<void> {
        document.onRevertDocumentEventEmitter.fire({ cancellation, diagramType: DIAGRAM_TYPE });
        return Promise.resolve();
    }

    backupCustomDocument(document: WorkflowDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
        document.onBackupDocumentEventEmitter.fire({ context, cancellation });
        return Promise.resolve({
            id: context.destination.toString(),
            delete: () => undefined
        });
    }

    openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): WorkflowDocument | Thenable<WorkflowDocument> {
        return new WorkflowDocument(uri);
    }

    resolveCustomEditor(document: WorkflowDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
        const localResourceRootsUri = vscode.Uri.file(
            path.join(this.extensionContext.extensionPath, './pack')
        );

        const webviewScriptSourceUri = vscode.Uri.file(
            path.join(this.extensionContext.extensionPath, './pack/webview.js')
        );

        // This is used to initialize sprotty for our diagram
        const sprottyDiagramIdentifier = {
            diagramType: DIAGRAM_TYPE,
            uri: serializeUri(document.uri),
            clientId: `${DIAGRAM_TYPE}_${this.viewCount++}`
        };

        // Prmise that resolves when sprotty sends its ready-message
        const webviewReadyPromise = new Promise<void>(resolve => {
            const messageListener = webviewPanel.webview.onDidReceiveMessage((message: unknown) => {
                if (isWebviewReadyMessage(message)) {
                    resolve();
                    messageListener.dispose();
                }
            });
        });

        const sendMessageToWebview = async (message: unknown): Promise<void> => {
            webviewReadyPromise.then(() => {
                if (webviewPanel.active) {
                    webviewPanel.webview.postMessage(message);
                } else {
                    console.log('Message stalled for webview:', document.uri.path, message);
                    const viewStateListener = webviewPanel.onDidChangeViewState(() => {
                        viewStateListener.dispose();
                        sendMessageToWebview(message);
                    });
                }
            });
        };

        const recieveMessageFromServerEmitter = new vscode.EventEmitter<unknown>();
        const sendMessageToServerEmitter = new vscode.EventEmitter<unknown>();

        webviewPanel.onDidDispose(() => {
            recieveMessageFromServerEmitter.dispose();
            sendMessageToServerEmitter.dispose();
        });

        // Listen for Messages from webview (only after ready-message has been recieved)
        webviewReadyPromise.then(() => {
            webviewPanel.webview.onDidReceiveMessage((message: unknown) => {
                if (isActionMessage(message)) {
                    sendMessageToServerEmitter.fire(message);
                }
            });
        });

        // Listen for Messages from server
        recieveMessageFromServerEmitter.event(message => {
            if (isActionMessage(message)) {
                sendMessageToWebview(message);
            }
        });

        // Register document/diagram panel/model in vscode adapter
        this.vscodeAdapter.registerClientAdapter({
            clientId: sprottyDiagramIdentifier.clientId,
            onClientRecieveEmitter: recieveMessageFromServerEmitter,
            onClientSend: sendMessageToServerEmitter.event,
            webviewPanel: webviewPanel,
            document: document,
            onDidChangeCustomDocumentEventEmitter: this.onDidChangeCustomDocumentEventEmitter
        });

        // Initialize diagram
        sendMessageToWebview(sprottyDiagramIdentifier);

        // Set focused context on open
        this.focusedEditorPanelClientId = sprottyDiagramIdentifier.clientId;
        vscode.commands.executeCommand('setContext', 'workflow-editor-focused', true);

        // Set focused context when panel is switched to
        webviewPanel.onDidChangeViewState(e => {
            if (e.webviewPanel.active) {
                this.focusedEditorPanelClientId = sprottyDiagramIdentifier.clientId;
            }

            if (this.focusedEditorPanelClientId === sprottyDiagramIdentifier.clientId) {
                vscode.commands.executeCommand('setContext', 'workflow-editor-focused', e.webviewPanel.active);
            }
        });

        webviewPanel.onDidDispose(() => {
            if (this.focusedEditorPanelClientId === sprottyDiagramIdentifier.clientId) {
                vscode.commands.executeCommand('setContext', 'workflow-editor-focused', false);
            }
        });

        webviewPanel.webview.options = {
            localResourceRoots: [localResourceRootsUri],
            enableScripts: true
        };

        webviewPanel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, height=device-height">
                    <link
                        rel="stylesheet" href="https://use.fontawesome.com/releases/v5.6.3/css/all.css"
                        integrity="sha384-UHRtZLI+pbxtHCWp1t77Bi1L4ZtiqrqD80Kn4Z8NTSRyMA2Fd33n5dQ8lWUE00s/"
                        crossorigin="anonymous">
                </head>
                <body>
                    <div id="${sprottyDiagramIdentifier.clientId}_container" style="height: 100%;"></div>
                    <script src="${webviewPanel.webview.asWebviewUri(webviewScriptSourceUri).toString()}"></script>
                </body>
            </html>`;
    }
}

function serializeUri(uri: vscode.Uri): string {
    let uriString = uri.toString();
    const match = uriString.match(/file:\/\/\/([a-z])%3A/i);
    if (match) {
        uriString = 'file:///' + match[1] + ':' + uriString.substring(match[0].length);
    }
    return uriString;
}
