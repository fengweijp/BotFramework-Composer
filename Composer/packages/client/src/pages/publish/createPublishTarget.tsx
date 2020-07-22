// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx } from '@emotion/core';
import formatMessage from 'format-message';
import { Dropdown, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import { Fragment, useState, useMemo, useEffect } from 'react';
import { PrimaryButton, DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { JsonEditor } from '@bfc/code-editor';

import { PublishTarget, PublishType } from '../../store/types';
import { useStoreContext } from '../../hooks/useStoreContext';

import { label } from './styles';
import { PluginHost } from '../../components/PluginHost/PluginHost';

interface CreatePublishTargetProps {
  closeDialog: () => void;
  current: PublishTarget | null;
  targets: PublishTarget[];
  types: PublishType[];
  updateSettings: (name: string, type: string, configuration: string) => Promise<void>;
}

declare global {
  interface Window {
    Composer: ComposerClientAPI;
  }
}

interface ComposerClientAPI {
  publish: PublishAPI;
}

interface PublishAPI {
  /** Let's composer know that the UI is ready to save the publish target */
  setReady?: (ready: boolean) => void;
  /** Let's composer know the most up-to-date publish configuration */
  onChangeConfig?: (updatedConfig: any) => void;
  submitConfig?: (config: any) => void;
}

const CreatePublishTarget: React.FC<CreatePublishTargetProps> = (props) => {
  const [targetType, setTargetType] = useState<string | undefined>(props.current?.type);
  const [name, setName] = useState(props.current ? props.current.name : '');
  const [config, setConfig] = useState(props.current ? JSON.parse(props.current.configuration) : undefined);
  const [errorMessage, setErrorMsg] = useState('');
  const {
    state: { userSettings },
  } = useStoreContext();

  const targetTypes = useMemo(() => {
    return props.types.map((t) => ({ key: t.name, text: t.description }));
  }, [props.targets]);

  const updateType = (_e, option?: IDropdownOption) => {
    const type = props.types.find((t) => t.name === option?.key);

    if (type) {
      setTargetType(type.name);
    }
  };

  const updateConfig = (newConfig) => {
    setConfig(newConfig);
  };

  const isNameValid = (newName) => {
    if (!newName || newName.trim() === '') {
      setErrorMsg(formatMessage('Must have a name'));
    } else {
      const exists = !!props.targets?.find((t) => t.name.toLowerCase() === newName?.toLowerCase);

      if (exists) {
        setErrorMsg(formatMessage('A profile with that name already exists.'));
      }
    }
  };

  const instructions: string | undefined = useMemo((): string | undefined => {
    return targetType ? props.types.find((t) => t.name === targetType)?.instructions : '';
  }, [props.targets, targetType]);

  const schema = useMemo(() => {
    return targetType ? props.types.find((t) => t.name === targetType)?.schema : undefined;
  }, [props.targets, targetType]);

  const hasView = useMemo(() => {
    return targetType ? props.types.find((t) => t.name === targetType)?.hasView : undefined;
  }, [props.targets, targetType]);

  const updateName = (e, newName) => {
    setErrorMsg('');
    setName(newName);
    isNameValid(newName);
  };

  const isDisable = () => {
    if (!targetType || !name || errorMessage) {
      return true;
    } else {
      return false;
    }
  };

  const submit = async () => {
    if (targetType) {
      await props.updateSettings(name, targetType, JSON.stringify(config) || '{}');
      props.closeDialog();
    }
  };

  useEffect(() => {
    const submitConfig = async (config) => {
      if (targetType) {
        console.log(`Got config from plugin ${name}: ${config}`);
        await props.updateSettings(name, targetType, JSON.stringify(config) || '{}');
        props.closeDialog();
      }
    };
    // hook up api to window
    if (!window.Composer) {
      window.Composer = { publish: { submitConfig: undefined } };
    }
    window.Composer.publish.submitConfig = submitConfig;
    return () => {
      // clean up the window object
      delete window.Composer.publish.submitConfig;
    };
  }, [targetType, name]);

  const publishTargetContent = useMemo(() => {
    if (hasView && targetType) {
      // render custom plugin view
      return <PluginHost pluginName={targetType} pluginType={'publish'}></PluginHost>;
    }
    // render default instruction / schema editor view
    return (
      <Fragment>
        {instructions && <p>{instructions}</p>}
        <div css={label}>{formatMessage('Publish Configuration')}</div>
        <JsonEditor
          key={targetType}
          editorSettings={userSettings.codeEditor}
          height={200}
          schema={schema}
          value={config}
          onChange={updateConfig}
        />
      </Fragment>
    );
  }, [targetType, instructions, schema, hasView]);

  return (
    <Fragment>
      <form /**onSubmit={submit}*/>
        <TextField
          defaultValue={props.current ? props.current.name : ''}
          errorMessage={errorMessage}
          label={formatMessage('Name')}
          placeholder={formatMessage('My Publish Profile')}
          onChange={updateName}
        />
        <Dropdown
          defaultSelectedKey={props.current ? props.current.type : null}
          label={formatMessage('Publish Destination Type')}
          options={targetTypes}
          placeholder={formatMessage('Choose One')}
          onChange={updateType}
        />
        {publishTargetContent}
        {/* <button hidden disabled={isDisable()} type="submit" /> */}
      </form>
      <DialogFooter>
        <DefaultButton text={formatMessage('Cancel')} onClick={props.closeDialog} />
        <PrimaryButton disabled={isDisable()} text={formatMessage('Save')} onClick={submit} />
      </DialogFooter>
    </Fragment>
  );
};

export { CreatePublishTarget };
