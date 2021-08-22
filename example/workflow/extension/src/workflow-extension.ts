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

import {
    GlspVscodeAdapter,
    NavigateAction,
    LayoutOperation,
    FitToScreenAction,
    CenterAction,
    RequestExportSvgAction
} from '@eclipse-glsp/vscode-integration';

import {
    GlspServerStarter,
    GlspServerAdapter
} from '@eclipse-glsp/vscode-integration/lib/quickstart-components';

import WorkflowEditorProvider from './workflow-editor-provider';

const DEFAULT_SERVER_PORT = '5007';
const DIAGRAM_TYPE = 'workflow-diagram';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // Start server process using quickstart component
    if (process.env.GLSP_SERVER_DEBUG !== 'true') {
        const workflowServer = new GlspServerStarter({
            jarPath: path.join(__dirname, '../server/org.eclipse.glsp.example.workflow-0.9.0-SNAPSHOT-glsp.jar'),
            serverPort: JSON.parse(process.env.GLSP_SERVER_PORT || DEFAULT_SERVER_PORT),
            additionalArgs: ['--fileLog', 'true', '--logDir', path.join(__dirname, '../server')],
            logging: true
        });
        context.subscriptions.push(workflowServer);
        await workflowServer.start();
    }

    // Wrap server with quickstart component
    const workflowServerAdapter = new GlspServerAdapter({
        clientId: 'glsp.workflow',
        clientName: 'workflow',
        serverPort: JSON.parse(process.env.GLSP_SERVER_PORT || DEFAULT_SERVER_PORT)
    });

    // Initialize GLSP-VSCode adapter with server wrapper
    const glspVscodeAdapter = new GlspVscodeAdapter({
        server: workflowServerAdapter,
        logging: true,
        diagramType: DIAGRAM_TYPE
    });

    const customEditorProvider = vscode.window.registerCustomEditorProvider(
        'workflow.glspDiagram',
        glspVscodeAdapter.wrapEditorProvider(new WorkflowEditorProvider(context, glspVscodeAdapter)),
        {
            webviewOptions: { retainContextWhenHidden: true },
            supportsMultipleEditorsPerDocument: false
        }
    );

    context.subscriptions.push(workflowServerAdapter, glspVscodeAdapter, customEditorProvider);
    workflowServerAdapter.start();

    // Keep track of selected elements
    let selectedElements: string[] = [];
    context.subscriptions.push(
        glspVscodeAdapter.onSelectionUpdate(n => {
            selectedElements = n;
            vscode.commands.executeCommand('setContext', 'workflow.editorSelectedElementsAmount', n.length);
        })
    );

    // Register various commands
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
        })
    );
}

