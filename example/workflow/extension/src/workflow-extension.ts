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
import * as process from 'process';
import * as path from 'path';

import { GlspVscodeAdapter, NavigateAction, LayoutOperation, FitToScreenAction, CenterAction, RequestExportSvgAction } from '@eclipse-glsp/vscode-integration';

import { WorkflowServer } from './workflow-server';
import { WorkflowServerAdapter } from './workflow-server-adapter';
import { WorkflowEditorProvider } from './workflow-editor-provider';

const DEFAULT_SERVER_PORT = '5007';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    if (process.env.GLSP_SERVER_DEBUG !== 'true') {
        const workflowServer = new WorkflowServer({
            jarPath: path.join(__dirname, '../server/org.eclipse.glsp.example.workflow-0.9.0-SNAPSHOT-glsp.jar'),
            serverPort: JSON.parse(process.env.GLSP_SERVER_PORT || DEFAULT_SERVER_PORT),
            additionalArgs: ['--fileLog', 'true', '--logDir', path.join(__dirname, '../server')],
            logging: true
        });
        context.subscriptions.push(workflowServer);
        await workflowServer.start();
    }

    const workflowServerAdapter = new WorkflowServerAdapter({
        clientId: 'glsp.workflow',
        extensionPrefix: 'workflow',
        serverPort: JSON.parse(process.env.GLSP_SERVER_PORT || DEFAULT_SERVER_PORT)
    });

    const glspVscodeAdapter = new GlspVscodeAdapter({
        server: workflowServerAdapter,
        logging: true
    });

    const customEditorProvider = vscode.window.registerCustomEditorProvider(
        'workflow.glspDiagram',
        new WorkflowEditorProvider(context, glspVscodeAdapter),
        {
            webviewOptions: { retainContextWhenHidden: true },
            supportsMultipleEditorsPerDocument: false
        }
    );

    context.subscriptions.push(workflowServerAdapter, glspVscodeAdapter, customEditorProvider);
    workflowServerAdapter.start();

    let selectedElements: string[] = [];

    context.subscriptions.push(
        vscode.commands.registerCommand('workflow.fit', () => {
            glspVscodeAdapter.sendActionToActiveClient(new FitToScreenAction(selectedElements));
        }),
        vscode.commands.registerCommand('workflow.center', () => {
            glspVscodeAdapter.sendActionToActiveClient(new CenterAction(selectedElements));
        }),
        vscode.commands.registerCommand('workflow.layout', () => {
            glspVscodeAdapter.sendActionToActiveClient(new LayoutOperation());
        }),
        vscode.commands.registerCommand('workflow.goToNextNode', () => {
            glspVscodeAdapter.sendActionToActiveClient(new NavigateAction('next'));
        }),
        vscode.commands.registerCommand('workflow.goToPreviousNode', () => {
            glspVscodeAdapter.sendActionToActiveClient(new NavigateAction('previous'));
        }),
        vscode.commands.registerCommand('workflow.showDocumentation', () => {
            glspVscodeAdapter.sendActionToActiveClient(new NavigateAction('documentation'));
        }),
        vscode.commands.registerCommand('workflow.exportAsSVG', () => {
            glspVscodeAdapter.sendActionToActiveClient(new RequestExportSvgAction());
        }),
        glspVscodeAdapter.onSelectionUpdate(n => {
            selectedElements = n;
            vscode.commands.executeCommand('setContext', 'workflow-editor-selected-elements-amount', n.length);
        })
    );
}

