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
import { GlspDiagramDocument as IGlspDiagramDocument } from '../types';

export class GlspDiagramDocument implements IGlspDiagramDocument {
    readonly onSaveDocumentEventEmitter = new vscode.EventEmitter<{ cancellation: vscode.CancellationToken }>();
    readonly onSaveDocumentAsEventEmitter = new vscode.EventEmitter<{ destination: vscode.Uri; cancellation: vscode.CancellationToken }>();
    readonly onRevertDocumentEventEmitter = new vscode.EventEmitter<{ cancellation: vscode.CancellationToken; diagramType: string }>();
    readonly onBackupDocumentEventEmitter = new vscode.EventEmitter<{ context: vscode.CustomDocumentBackupContext; cancellation: vscode.CancellationToken }>();

    readonly onSaveDocumentEvent: vscode.Event<{ cancellation: vscode.CancellationToken }>;
    readonly onSaveDocumentAsEvent: vscode.Event<{ destination: vscode.Uri; cancellation: vscode.CancellationToken }>;
    readonly onRevertDocumentEvent: vscode.Event<{ cancellation: vscode.CancellationToken; diagramType: string }>;
    readonly onBackupDocumentEvent: vscode.Event<{ context: vscode.CustomDocumentBackupContext; cancellation: vscode.CancellationToken }>;
    readonly onDocumentSavedEventEmitter = new vscode.EventEmitter<void>();

    constructor(readonly uri: vscode.Uri) {
        this.onSaveDocumentEvent = this.onSaveDocumentEventEmitter.event;
        this.onSaveDocumentAsEvent = this.onSaveDocumentAsEventEmitter.event;
        this.onRevertDocumentEvent = this.onRevertDocumentEventEmitter.event;
        this.onBackupDocumentEvent = this.onBackupDocumentEventEmitter.event;
    }

    dispose(): void {
        this.onSaveDocumentEventEmitter.dispose();
        this.onSaveDocumentAsEventEmitter.dispose();
        this.onRevertDocumentEventEmitter.dispose();
        this.onBackupDocumentEventEmitter.dispose();
        this.onDocumentSavedEventEmitter.dispose();
    }
}
