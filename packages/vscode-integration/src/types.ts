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

/**
 * Documents are used as a carrier of state between events (save, backup or revert
 * events and so on). The VSCode integration requires CustomDocuments that are used
 * by the CustomEditorProvider to implement the following interface in order to listen
 * for such events and handle them accordingly in the background.
 *
 * An extendable default implementation is provided under '@eclipse-glsp/vscode-integration/lib/quickstart-components'.
 */
export interface GlspDiagramDocument extends vscode.CustomDocument {

    /**
     * This event should be fired when the CustomEditorProvider.saveCustomDocument()
     * function is called.
     * The arguments from that function should be passed in the event.
     *
     * The VSCode integration will use this event to save the file behind the document.
     */
    readonly onSaveDocumentEvent: vscode.Event<{
        cancellation: vscode.CancellationToken;
    }>;

    /**
     * This event should be fired when the CustomEditorProvider.saveCustomDocumentAs()
     * function is called.
     * The arguments from that function should be passed in the event.
     *
     * The VSCode integration will use this event to trigger a 'Save as...' on the
     * file behind the document.
     */
    readonly onSaveDocumentAsEvent: vscode.Event<{
        destination: vscode.Uri;
        cancellation: vscode.CancellationToken;
    }>;

    /**
     * This event should be fired when the CustomEditorProvider.revertCustomDocument()
     * function is called.
     * The arguments from that function should be passed in the event.
     *
     * The VSCode integration will use this event to revert the file behind the
     * document.
     */
    readonly onRevertDocumentEvent: vscode.Event<{
        cancellation: vscode.CancellationToken;
        diagramType: string;
    }>;

    /**
     * This event should be fired when the CustomEditorProvider.backupCustomDocument()
     * function is called.
     * The arguments from that function should be passed in the event.
     *
     * The VSCode integration currently will not do anything with this event but
     * it is recommended to implement this event for future features.
     */
    readonly onBackupDocumentEvent: vscode.Event<{
        context: vscode.CustomDocumentBackupContext;
        cancellation: vscode.CancellationToken;
    }>;

    /**
     * The VSCode integration will use this event emitter to notify the extension
     * when a save action (like from `save` and `save as...`) has completed.
     *
     * You can use this event to resolve the promises returned by`CustomEditorProvider.saveCustomDocument()`
     * or `CustomEditorProvider.saveCustomDocumentAs()`.
     */
    readonly onDocumentSavedEventEmitter: vscode.EventEmitter<void>;
}

/**
 * Any clients registered on the GLSP VSCode integration need to implement this
 * interface.
 */
export interface GlspVscodeClient {

    /**
     * A unique identifier for the client/panel with which the client will be registered
     * on the server.
     */
    readonly clientId: string;

    /**
     * The webview belonging to the client.
     */
    readonly webviewPanel: vscode.WebviewPanel;

    /**
     * The document object belonging to the client;
     */
    readonly document: GlspDiagramDocument;

    /**
     * An event emitter which the VSCode integration will use to notify about dirty
     * state changes. You can use the event attached to this emitter to provide
     * the `onDidChangeCustomDocument` property on your `CustomEditorProvider`.
     */
    readonly onDidChangeCustomDocumentEventEmitter: vscode.EventEmitter<vscode.CustomDocumentEditEvent<GlspDiagramDocument>>;

    /**
     * This event emitter is used by the VSCode integration to pass messages/actions
     * to the client. These messages can come from the server or the VSCode integration
     * itself.
     *
     * You should subscribe to the attached event and pass contents of the event
     * to the webview.
     *
     * Use the properties `onBeforeReceiveMessageFromServer` and `onBeforePropagateMessageToClient`
     * of the GlspVscodeAdapter in order to control what messages are propagated
     * and processed.
     */
    readonly onClientReceiveEmitter: vscode.EventEmitter<unknown>;

    /**
     * This event is used to notify the VSCode integration about messages from the
     * client.
     *
     * Fire this event with the message the client wants to send to the server.
     *
     * Use the properties `onBeforeReceiveMessageFromClient` and `onBeforePropagateMessageToServer`
     * of the GlspVscodeAdapter in order to control what messages are propagated
     * and processed.
     */
    readonly onClientSend: vscode.Event<unknown>;
}

/**
 * The server or server wrapper used by the VSCode integration needs to implement
 * this interface.
 */
export interface GlspVscodeServer {

    /**
     * An event emitter used by the VSCode extension to send messages to the server.
     * You should listen to the event attached to this emitter to receive messages
     * from the client/VSCode integration and send it to the server.
     *
     * Use the properties `onBeforeReceiveMessageFromClient` and `onBeforePropagateMessageToServer`
     * of the GlspVscodeAdapter in order to control what messages are propagated
     * and processed.
     */
    readonly onServerReceiveEmitter: vscode.EventEmitter<unknown>;

    /**
     * An event the VSCode integration uses to receive messages from the server.
     * The messages are then propagated to the client or processed by the VSCode
     * integration to provide functionality.
     *
     * Fire this event with the message you want to send to the client.
     *
     * Use the properties `onBeforeReceiveMessageFromServer` and `onBeforePropagateMessageToClient`
     * of the GlspVscodeAdapter in order to control what messages are propagated
     * and processed.
     */
    readonly onServerSend: vscode.Event<unknown>;
}

interface InterceptorCallback {
    /**
     * This callback controls what message should be propagated to the VSCode integration
     * and whether the VSCode integration should process it (ie. provide functionality
     * based on the message).
     *
     * @param newMessage The message to be propagated. This value can be anything,
     * however if it is `undefined` the message will not be propagated further.
     * @param shouldBeProcessedByAdapter Optional parameter indicating whether the
     * VSCode integration should process the message. That usually means providing
     * functionality based on the message but also modifying it or blocking it from
     * being propagated further.
     */
    (newMessage: unknown | undefined, shouldBeProcessedByAdapter?: boolean): void;
}

export interface GlspVscodeAdapterConfiguration {

    /**
     * The GLSP server (or its wrapper) that the VSCode integration should use.
     */
    server: GlspVscodeServer;

    /**
     * Wether the GLSP-VSCode integration should log various events. This is useful
     * if you want to find out what events the VSCode integration is receiving from
     * and sending to the server and clients.
     *
     * Defaults to `false`.
     */
    logging?: boolean;

    /**
     * Optional property to intercept (and/or modify) messages sent from the client
     * to the VSCode integration via `GlspVscodeClient.onClientSend`.
     *
     * @param message Contains the original message sent by the client.
     * @param callback A callback to control how messages are handled further.
     */
    onBeforeReceiveMessageFromClient?: (message: unknown, callback: InterceptorCallback) => void;

    /**
     * Optional property to intercept (and/or modify) messages sent from the server
     * to the VSCode integration via `GlspVscodeServer.onServerSend`.
     *
     * @param message Contains the original message sent by the client.
     * @param callback A callback to control how messages are handled further.
     */
    onBeforeReceiveMessageFromServer?(message: unknown, callback: InterceptorCallback): void;

    /**
     * Optional property to intercept (and/or modify) messages sent from the VSCode
     * integration to the server via the `GlspVscodeServer.onServerReceiveEmitter`.
     *
     * The returned value from this function is the message that will be propagated
     * to the server. It can be modified to anything. Returning `undefined` will
     * cancel the propagation.
     *
     * @param originalMessage The original message received by the VSCode integration
     * from the client.
     * @param processedMessage If the VSCode integration modified the received message
     * in any way, this parameter will contain the modified message. If the VSCode
     * integration did not modify the message, this parameter will be identical to
     * `originalMessage`.
     * @param messageChanged This parameter will indicate wether the VSCode integration
     * modified the incoming message. In other words: Whether `originalMessage`
     * and `processedMessage` are different.
     * @returns A message that will be propagated to the server. If the message
     * is `undefined` the propagation will be cancelled.
     */
    onBeforePropagateMessageToServer?(
        originalMessage: unknown, processedMessage: unknown, messageChanged: boolean
    ): unknown | undefined;

    /**
     * Optional property to intercept (and/or modify) messages sent from the VSCode
     * integration to a client via the `GlspVscodeClient.onClientReceiveEmitter`.
     *
     * The returned value from this function is the message that will be propagated
     * to the client. It can be modified to anything. Returning `undefined` will
     * cancel the propagation.
     *
     * @param originalMessage The original message received by the VSCode integration
     * from the server.
     * @param processedMessage If the VSCode integration modified the received message
     * in any way, this parameter will contain the modified message. If the VSCode
     * integration did not modify the message, this parameter will be identical to
     * `originalMessage`.
     * @param messageChanged This parameter will indicate wether the VSCode integration
     * modified the incoming message. In other words: Whether `originalMessage`
     * and `processedMessage` are different.
     * @returns A message that will be propagated to the client. If the message
     * is `undefined` the propagation will be cancelled.
     */
    onBeforePropagateMessageToClient?(
        originalMessage: unknown, processedMessage: unknown, messageChanged: boolean
    ): unknown | undefined;
}
