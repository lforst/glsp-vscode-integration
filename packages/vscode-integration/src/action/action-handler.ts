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
import { Action } from 'sprotty-vscode-protocol';

/**
 * Used to locally intercept and handle actions in the VS Code extension.
 */
export interface ExtensionActionHandler {

    /**
     * List of action names that the action handler will intercept.
     */
    readonly kinds: string[];

    /**
     * @returns true when the action should be further progagated to the glsp server or the
     * webview
     */
    handleAction(action: Action): Thenable<boolean>;
}
