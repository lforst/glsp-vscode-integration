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
import { GlspVscodeClient } from './types';

export class ClientRegistry<D extends vscode.CustomDocument> {

    private readonly clientSet = new Set<GlspVscodeClient<D>>();
    private readonly idMap = new Map<string, GlspVscodeClient<D>>();
    private readonly documentMap = new Map<D, GlspVscodeClient<D>>();

    get clients(): GlspVscodeClient<D>[] {
        return [...this.clientSet];
    }

    addClient(client: GlspVscodeClient<D>): void {
        this.clientSet.add(client);
        this.idMap.set(client.clientId, client);
        this.documentMap.set(client.document, client);
    }

    removeClient(client: GlspVscodeClient<D>): void {
        this.clientSet.delete(client);
        this.idMap.delete(client.clientId);
        this.documentMap.delete(client.document);
    }

    getClientById(id: string): GlspVscodeClient<D> | undefined {
        return this.idMap.get(id);
    }

    getClientByDocument(document: D): GlspVscodeClient<D> | undefined {
        return this.documentMap.get(document);
    }
}
