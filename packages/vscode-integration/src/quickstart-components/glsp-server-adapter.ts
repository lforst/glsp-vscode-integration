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

import * as net from 'net';
import * as vscode from 'vscode';
import { createMessageConnection, SocketMessageReader, SocketMessageWriter } from 'vscode-jsonrpc';
import { ApplicationIdProvider, BaseJsonrpcGLSPClient } from '@eclipse-glsp/protocol';
import { isActionMessage } from 'sprotty-vscode-protocol';

import { GlspVscodeServer } from '../types';

interface Options {
    readonly serverPort: number;
    readonly clientId: string;
    readonly clientName: string;
}

export class GlspServerAdapter implements GlspVscodeServer, vscode.Disposable {
    readonly onServerReceiveEmitter = new vscode.EventEmitter<unknown>();
    readonly onServerSendEmitter = new vscode.EventEmitter<unknown>();
    readonly onServerSend: vscode.Event<unknown>;

    private socket = new net.Socket();
    private glspClient: BaseJsonrpcGLSPClient;

    private onReady: Promise<void>;
    private setReady: () => void;

    constructor(private readonly options: Options) {
        this.onReady = new Promise(resolve => {
            this.setReady = resolve;
        });

        this.onServerSend = this.onServerSendEmitter.event;

        const reader = new SocketMessageReader(this.socket);
        const writer = new SocketMessageWriter(this.socket);
        const connection = createMessageConnection(reader, writer);

        this.glspClient = new BaseJsonrpcGLSPClient({
            id: options.clientId,
            name: options.clientName,
            connectionProvider: connection
        });

        this.onServerReceiveEmitter.event(message => {
            this.onReady.then(() => {
                if (isActionMessage(message)) {
                    this.glspClient.sendActionMessage(message);
                }
            });
        });
    }

    async start(): Promise<void> {
        this.socket.connect(this.options.serverPort);

        await this.glspClient.start();
        await this.glspClient.initializeServer({ applicationId: ApplicationIdProvider.get() });

        // The listener cant be registered before `glspClient.start()` because the glspClient will reject the listener
        // if it has not connected to the server yet.
        this.glspClient.onActionMessage(message => {
            this.onServerSendEmitter.fire(message);
        });

        this.setReady();
    }

    async stop(): Promise<void> {
        return this.glspClient.stop();
    }

    dispose(): void {
        this.onServerReceiveEmitter.dispose();
        this.onServerSendEmitter.dispose();
        this.stop();
    }
}
