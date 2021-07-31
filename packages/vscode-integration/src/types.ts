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
    readonly onClientReceiveEmitter: vscode.EventEmitter<unknown>;
    readonly onClientSend: vscode.Event<unknown>;
}

export interface GlspServerWrapper {
    readonly onServerReceiveEmitter: vscode.EventEmitter<unknown>;
    readonly onServerSend: vscode.Event<unknown>;
}

export interface GlspVscodeAdapterConfiguration {
    server: GlspServerWrapper;
    logging?: boolean;
    onBeforeReceiveMessageFromClient?: (
        message: unknown,
        callback: (newMessage: unknown | undefined, shouldBeProcessedByAdapter?: boolean) => void
    ) => void;
    onBeforeReceiveMessageFromServer?: (
        message: unknown,
        callback: (newMessage: unknown | undefined, shouldBeProcessedByAdapter?: boolean) => void
    ) => void;
    onBeforePropagateMessageToServer?: (originalMessage: unknown, processedMessage: unknown, messageChanged: boolean) => unknown | undefined;
    onBeforePropagateMessageToClient?: (originalMessage: unknown, processedMessage: unknown, messageChanged: boolean) => unknown | undefined;
}
