/********************************************************************************
 * Copyright (c) 2021 EclipseSource and  others.
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

import { Action } from './action';

interface Args { [key: string]: string | number | boolean }

interface LabeledAction {
    readonly label: string;
    readonly actions: Action[];
    readonly icon?: string;
}

export class RequestContextAction implements Action {
    static readonly KIND = 'requestContextActions';
    constructor(public readonly contextId: string, public readonly editorContext: any, public readonly kind = RequestContextAction.KIND) { }

    static is(action?: Action): action is RequestContextAction {
        return action !== undefined &&
            action.kind === RequestContextAction.KIND &&
            'contextId' in action &&
            'editorContext' in action;
    }
}

export class SetContextAction implements Action {
    static readonly KIND = 'setContextActions';
    constructor(public readonly actions: LabeledAction[], public readonly args?: Args, public readonly kind = SetContextAction.KIND) { }

    static is(action?: Action): action is SetContextAction {
        return action !== undefined && action.kind === SetContextAction.KIND && 'actions' in action;
    }
}
