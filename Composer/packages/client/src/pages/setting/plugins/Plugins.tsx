// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx } from '@emotion/core';
import React, { useEffect, useState, useCallback } from 'react';
import { RouteComponentProps } from '@reach/router';
import {
  DetailsList,
  DetailsListLayoutMode,
  SelectionMode,
  IColumn,
  CheckboxVisibility,
} from 'office-ui-fabric-react/lib/DetailsList';
import { DefaultButton, PrimaryButton } from 'office-ui-fabric-react/lib/Button';
import formatMessage from 'format-message';
import { Dialog, DialogType, DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import axios from 'axios';

import { Plugin } from '../../../store/types';
import { useStoreContext } from '../../../hooks/useStoreContext';
import { ToolBar } from '../../../components/ToolBar/ToolBar';
import { IToolBarItem } from '../../../components/ToolBar/ToolBar.types';
import httpClient from '../../../utils/httpUtil';

const Plugins: React.FC<RouteComponentProps> = () => {
  const {
    state: { plugins },
    actions: { fetchPlugins, togglePlugin, addPlugin, removePlugin },
  } = useStoreContext();
  const [showNewModal, setShowNewModal] = useState(false);
  const [pluginName, setPluginName] = useState<string | null>(null);
  const [pluginVersion, setPluginVersion] = useState<string | null>(null);
  const [matchingPlugins, setMatchingPlugins] = useState<Plugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<any>();

  useEffect(() => {
    fetchPlugins();
  }, []);

  useEffect(() => {
    if (pluginName !== null) {
      const source = axios.CancelToken.source();

      const timer = setTimeout(() => {
        httpClient
          .get(`/plugins/search?q=${pluginName}`, { cancelToken: source.token })
          .then((res) => {
            setMatchingPlugins(res.data);
          })
          .catch((err) => {
            if (!axios.isCancel(err)) {
              console.error(err);
            }
          });
      }, 200);

      return () => {
        source.cancel('User interruption');
        clearTimeout(timer);
      };
    }
  }, [pluginName]);

  const installedColumns: IColumn[] = [
    {
      key: 'name',
      name: formatMessage('Name'),
      minWidth: 100,
      maxWidth: 150,
      onRender: (item: Plugin) => {
        return <span>{item.id}</span>;
      },
    },
    {
      key: 'version',
      name: formatMessage('Version'),
      minWidth: 30,
      maxWidth: 100,
      onRender: (item: Plugin) => {
        return <span>{item.version}</span>;
      },
    },
    {
      key: 'enabled',
      name: formatMessage('Enabled'),
      minWidth: 30,
      maxWidth: 150,
      onRender: (item: Plugin) => {
        const text = item.enabled ? formatMessage('Disable') : formatMessage('Enable');
        return <DefaultButton onClick={() => togglePlugin(item.id, !item.enabled)}>{text}</DefaultButton>;
      },
    },
    {
      key: 'remove',
      name: formatMessage('Remove'),
      minWidth: 30,
      maxWidth: 150,
      onRender: (item: Plugin) => {
        return <DefaultButton onClick={() => removePlugin(item.id)}>{formatMessage('Remove')}</DefaultButton>;
      },
    },
  ];

  const matchingColumns: IColumn[] = [
    {
      key: 'name',
      name: formatMessage('Name'),
      minWidth: 100,
      maxWidth: 150,
      onRender: (item: any) => {
        return <span>{item.id}</span>;
      },
    },
    {
      key: 'description',
      name: formatMessage('Description'),
      minWidth: 100,
      maxWidth: 300,
      isMultiline: true,
      onRender: (item: any) => {
        return <div css={{ overflowWrap: 'break-word' }}>{item.description}</div>;
      },
    },
    {
      key: 'version',
      name: formatMessage('Version'),
      minWidth: 30,
      maxWidth: 100,
      onRender: (item: any) => {
        return <span>{item.version}</span>;
      },
    },
    {
      key: 'url',
      name: formatMessage('Url'),
      minWidth: 100,
      maxWidth: 100,
      onRender: (item: any) => {
        return item.url ? (
          <a href={item.url} rel="noopener noreferrer" target="_blank">
            View on npm
          </a>
        ) : null;
      },
    },
  ];

  const toolbarItems: IToolBarItem[] = [
    {
      type: 'action',
      text: formatMessage('Add'),
      buttonProps: {
        iconProps: {
          iconName: 'Add',
        },
        onClick: () => {
          setShowNewModal(true);
        },
      },
      align: 'left',
    },
  ];

  const submit = useCallback(() => {
    if (selectedPlugin) {
      addPlugin(selectedPlugin.id, pluginVersion);
      setShowNewModal(false);
      setPluginName(null);
      setPluginVersion(null);
      setSelectedPlugin(null);
    }
  }, [selectedPlugin]);

  return (
    <div>
      <ToolBar toolbarItems={toolbarItems} />
      <DetailsList
        checkboxVisibility={CheckboxVisibility.hidden}
        columns={installedColumns}
        items={plugins}
        layoutMode={DetailsListLayoutMode.justified}
        selectionMode={SelectionMode.single}
      />
      <Dialog
        dialogContentProps={{
          type: DialogType.close,
          title: formatMessage('Add new plugin'),
          subText: formatMessage('Search for plugins'),
        }}
        hidden={!showNewModal}
        minWidth="600px"
        onDismiss={() => setShowNewModal(false)}
      >
        <div>
          <TextField
            label={formatMessage('Plugin name')}
            value={pluginName ?? ''}
            onChange={(_e, val) => setPluginName(val ?? null)}
          />
          <DetailsList
            checkboxVisibility={CheckboxVisibility.always}
            columns={matchingColumns}
            items={matchingPlugins}
            layoutMode={DetailsListLayoutMode.justified}
            selectionMode={SelectionMode.single}
            onActiveItemChanged={(item) => setSelectedPlugin(item)}
          />
        </div>
        <DialogFooter>
          <DefaultButton onClick={() => setShowNewModal(false)}>Cancel</DefaultButton>
          <PrimaryButton disabled={false} onClick={submit}>
            {formatMessage('Add')}
          </PrimaryButton>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export { Plugins };
