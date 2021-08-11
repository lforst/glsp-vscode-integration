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

import { GlspEditorProvider } from './quickstart-components/glsp-editor-provider';

export function wrapCustomEditorProvider<D extends vscode.CustomDocument, T extends GlspEditorProvider<D>>(customEditorProvider: T): vscode.CustomEditorProvider<D> {
    return new class implements vscode.CustomEditorProvider<D> {
        onDidChangeCustomDocument = customEditorProvider.glspVscodeAdapter.onDidChangeCustomDocument;

        saveCustomDocument(document: D, cancellation: vscode.CancellationToken): Thenable<void> {
            return Promise.all([
                customEditorProvider.saveCustomDocument(document, cancellation),
                customEditorProvider.glspVscodeAdapter.saveDocument(document)
            ]).then(() => undefined);
        }

        saveCustomDocumentAs(document: D, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
            return Promise.all([
                customEditorProvider.saveCustomDocumentAs(document, destination, cancellation),
                customEditorProvider.glspVscodeAdapter.saveDocument(document, destination)
            ]).then(() => undefined);
        }

        revertCustomDocument(document: D, cancellation: vscode.CancellationToken): Thenable<void> {
            return Promise.all([
                customEditorProvider.revertCustomDocument(document, cancellation),
                customEditorProvider.glspVscodeAdapter.revertDocument(document, customEditorProvider.diagramType)
            ]).then(() => undefined);
        }

        backupCustomDocument(document: D, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
            return customEditorProvider.backupCustomDocument(document, context, cancellation);
        }

        openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): D | Thenable<D> {
            return customEditorProvider.openCustomDocument(uri, openContext, token);
        }

        resolveCustomEditor(document: D, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
            return customEditorProvider.resolveCustomEditor(document, webviewPanel, token);
        }
    };
}
