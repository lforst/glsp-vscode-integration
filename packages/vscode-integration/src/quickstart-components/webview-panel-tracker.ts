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

interface WebviewPanelTrackerParams {
    readonly onNoWebviewActive?: () => void;
    readonly onWebviewActive?: () => void;
}

export class WebviewPanelTracker {
    private readonly params: Required<WebviewPanelTrackerParams>;
    private activeWebviewPanel?: vscode.WebviewPanel;

    constructor(params: WebviewPanelTrackerParams) {
        this.params = {
            onNoWebviewActive: () => undefined,
            onWebviewActive: () => undefined,
            ...params
        };
    }

    registerPanel(panel: vscode.WebviewPanel): void {
        if (panel.active) {
            this.params.onWebviewActive();
            this.activeWebviewPanel = panel;
        }

        panel.onDidChangeViewState(e => {
            if (e.webviewPanel.active) {
                this.activeWebviewPanel = panel;
                this.params.onWebviewActive();
            }

            if (!e.webviewPanel.active && this.activeWebviewPanel === panel) {
                this.params.onNoWebviewActive();
            }
        });

        panel.onDidDispose(() => {
            if (this.activeWebviewPanel === panel) {
                this.params.onNoWebviewActive();
            }
        });
    }
}
