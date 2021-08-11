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
import { GlspVscodeAdapter } from '../glsp-vscode-adapter';

export abstract class GlspEditorProvider<D extends vscode.CustomDocument = vscode.CustomDocument> implements Omit<vscode.CustomEditorProvider<D>, 'onDidChangeCustomDocument'> {
    abstract readonly glspVscodeAdapter: GlspVscodeAdapter<D>;

    /** The type of the diagram identical to the registered type on the server. */
    abstract readonly diagramType: string;

    saveCustomDocument(
        document: D,
        cancellation: vscode.CancellationToken
    ): Thenable<void> {
        return Promise.resolve();
    }

    saveCustomDocumentAs(
        document: D,
        destination: vscode.Uri,
        cancellation: vscode.CancellationToken
    ): Thenable<void> {
        return Promise.resolve();
    }

    revertCustomDocument(
        document: D,
        cancellation: vscode.CancellationToken
    ): Thenable<void> {
        return Promise.resolve();
    }

    backupCustomDocument(
        document: D,
        context: vscode.CustomDocumentBackupContext,
        cancellation: vscode.CancellationToken
    ): Thenable<vscode.CustomDocumentBackup> {
        return Promise.resolve({
            id: context.destination.toString(),
            delete: () => undefined
        });
    }

    openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        token: vscode.CancellationToken
    ): Thenable<D> {
        return Promise.resolve({
            uri,
            dispose: () => {
                // Do nothing. Can't return undefined here because of typing.
            }
        });
    }

    abstract resolveCustomEditor(
        document: D,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): void | Thenable<void>;
}
