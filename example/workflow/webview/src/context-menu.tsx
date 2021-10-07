/********************************************************************************
 * Copyright (c) 2020-2021 EclipseSource and others.
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
/* eslint-disable no-null/no-null */ // null is needed in react as "no component"

import React, { useEffect, useState, useRef } from 'react';
import { vscodeApi } from 'sprotty-vscode-webview/lib/vscode-api';
import { render } from 'react-dom';
import styles from './context-menu.module.css';

const contextMenuContainer = document.createElement('div');
document.body.insertBefore(contextMenuContainer, document.body.firstChild);

enum ContextMenuMode {
    INACTIVE,
    WAITING_FOR_ACTION,
    ACTIVE
}

interface ContextMenuPosition {
    top: number;
    left: number;
}

type ContextMenuState =
    { mode: ContextMenuMode.INACTIVE } |
    { mode: ContextMenuMode.WAITING_FOR_ACTION; position: ContextMenuPosition } |
    { mode: ContextMenuMode.ACTIVE; position: ContextMenuPosition; labeledActions: LabeledAction[]; clientId: string };

interface LabeledAction {
    label: string;
    actions: unknown[];
    children?: LabeledAction[];
}

const ContextMenuMainComponent: React.FC = () => {
    const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({ mode: ContextMenuMode.INACTIVE });
    const mainComponentRef = useRef<HTMLDivElement>(null);

    // Create listener for right-clicks to open the context menu
    useEffect(() => {
        const contextMenuListener = (contextEvent: MouseEvent): void => {
            contextEvent.preventDefault();

            const mouseUpListener = (mouseUpEvent: MouseEvent): void => {
                document.removeEventListener('mouseup', mouseUpListener);
                if (
                    contextEvent.pageY !== mouseUpEvent.pageY ||
                    contextEvent.pageX !== mouseUpEvent.pageX
                ) {
                    setContextMenuState({ mode: ContextMenuMode.INACTIVE });
                }
            };
            document.addEventListener('mouseup', mouseUpListener);

            setContextMenuState(oldState => {
                if (
                    oldState.mode !== ContextMenuMode.INACTIVE &&
                    oldState.position.top === contextEvent.pageY &&
                    oldState.position.left === contextEvent.pageX
                ) {
                    return { mode: ContextMenuMode.INACTIVE };
                } else if (mainComponentRef.current?.contains(contextEvent.target as HTMLElement)) {
                    return oldState;
                } else {
                    return {
                        mode: ContextMenuMode.WAITING_FOR_ACTION,
                        position: {
                            top: contextEvent.pageY + 1, // add one pixel so the context menu isn't hovered right away
                            left: contextEvent.pageX
                        }
                    };
                }
            });
        };

        window.addEventListener('contextmenu', contextMenuListener, false);
        return () => {
            window.removeEventListener('contextmenu', contextMenuListener);
        };
    }, []);

    // Create listener for left-clicks to close the context menu
    useEffect(() => {
        const clickListener = (e: MouseEvent): void => {
            if (!mainComponentRef.current?.contains(e.target as HTMLElement)) {
                setContextMenuState({ mode: ContextMenuMode.INACTIVE });
            }
        };

        window.addEventListener('click', clickListener);
        return () => {
            window.removeEventListener('click', clickListener);
        };
    }, []);

    // Create listener for context menu action
    useEffect(() => {
        const messageHandler = (e: MessageEvent): void => {
            setContextMenuState(oldState => {
                if (
                    e.data?.action?.kind === 'setContextActions' &&
                    oldState.mode === ContextMenuMode.WAITING_FOR_ACTION
                ) {
                    console.log('message', e.data);
                    return {
                        mode: ContextMenuMode.ACTIVE,
                        position: oldState.position,
                        labeledActions: e.data.action.actions,
                        clientId: e.data.clientId
                    };
                } else {
                    return oldState;
                }
            });
        };

        window.addEventListener('message', messageHandler);
        return () => {
            window.removeEventListener('message', messageHandler);
        };
    }, []);

    if (contextMenuState.mode === ContextMenuMode.ACTIVE) {
        return (
            <div
                ref={mainComponentRef}
                className={styles.mainComponent}
                style={{
                    top: contextMenuState.position.top,
                    left: contextMenuState.position.left
                }}
            >
                <ContextMenu
                    labeledActions={contextMenuState.labeledActions}
                    clientId={contextMenuState.clientId}
                    onClosingAction={() => setContextMenuState({ mode: ContextMenuMode.INACTIVE })}
                />
            </div>
        );
    } else {
        return null;
    }
};

interface ContextMenuProps {
    labeledActions: LabeledAction[];
    clientId: string;
    onClosingAction: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ labeledActions, clientId, onClosingAction }) => {
    const [openItem, setOpenItem] = useState<number | null>(null);

    return (
        <div className={styles.contextMenu}>
            <ul>
                {labeledActions.map((labeledAction, i) => (
                    <li key={labeledAction.label}>
                        <div className={styles.contextMenuChildContainer}>
                            {openItem === i && labeledAction.children?.length
                                ? <ContextMenu
                                    labeledActions={labeledAction.children}
                                    clientId={clientId}
                                    onClosingAction={onClosingAction}
                                /> : null}
                        </div>
                        <div
                            className={styles.contextMenuItem}
                            onClick={() => {
                                labeledAction.actions.forEach(action => {
                                    vscodeApi.postMessage({ clientId, action });
                                    onClosingAction();
                                });
                            }}
                            onMouseOver={() => {
                                setOpenItem(i);
                            }}
                        >
                            <label>{labeledAction.label}</label>
                            {!!labeledAction.children?.length && < i className="fas fa-caret-right" />}
                        </div>
                    </li>)
                )}
            </ul>
        </div>
    );
};

render(<ContextMenuMainComponent />, contextMenuContainer);
