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

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';

const START_UP_COMPLETE_MSG = '[GLSP-Server]:Startup completed';

export interface JavaSocketServerLaunchOptions {
    /** Path to the location of the jar file that should be launched as process */
    readonly jarPath: string;
    /** Port on which the server should listen for new client connections */
    readonly serverPort: number;
    readonly logging?: boolean;
    /** Additional arguments that should be passed when starting the server process. */
    readonly additionalArgs?: string[];
}

export class WorkflowServer implements vscode.Disposable {
    private readonly options: Required<JavaSocketServerLaunchOptions>;
    private serverProcess?: childProcess.ChildProcess;

    constructor(options: JavaSocketServerLaunchOptions) {
        // Create default options
        this.options = {
            logging: false,
            additionalArgs: [],
            ...options
        };
    }

    async start(): Promise<void> {
        return new Promise(resolve => {
            const jarPath = this.options.jarPath;

            if (!fs.existsSync(jarPath)) {
                throw Error(`Could not launch GLSP server. The given jar path is not valid: ${jarPath}`);
            }

            const args = ['-jar', this.options.jarPath, '--port', `${this.options.serverPort}`, ...this.options.additionalArgs];

            const process = childProcess.spawn('java', args);
            this.serverProcess = process;

            process.stderr.on('data', data => {
                if (data && this.options.logging) {
                    console.error('GLSP-Server:', data.toString());
                }
            });

            process.stdout.on('data', data => {
                if (data.toString().includes(START_UP_COMPLETE_MSG)) {
                    resolve();
                }

                if (this.options.logging) {
                    console.log('GLSP-Server:', data.toString());
                }
            });

            process.on('error', error => {
                if (this.options.logging) {
                    console.error('GLSP-Server:', error);
                }

                if (error.message.includes('ENOENT')) {
                    throw new Error('Failed to spawn java\nPerhaps it is not on the PATH.');
                } else {
                    throw error;
                }
            });
        });
    }

    stop(): void {
        if (this.serverProcess && !this.serverProcess.killed) {
            this.serverProcess.kill();
        }
    }

    dispose(): void {
        this.stop();
    }
}
