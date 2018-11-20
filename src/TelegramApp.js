/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, {Component} from 'react';
import classNames from 'classnames';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import localForage from 'localforage';
import LocalForageWithGetItems from 'localforage-getitems';
import packageJson from '../package.json';
import DialogInfo from './Components/ColumnRight/DialogInfo';
import Dialogs from './Components/ColumnLeft/Dialogs';
import DialogDetails from './Components/ColumnMiddle/DialogDetails';
import AuthFormControl from './Components/Auth/AuthFormControl';
import Footer from './Components/Footer';
import MediaViewer from './Components/Viewer/MediaViewer';
import AppInactiveControl from './Components/Additional/AppInactiveControl';
import registerServiceWorker from './registerServiceWorker';
import ChatStore from './Stores/ChatStore';
import ApplicationStore from './Stores/ApplicationStore';
import TdLibController from './Controllers/TdLibController'
import './TelegramApp.css';

const theme = createMuiTheme({
    palette: {
        primary: { main: '#3B9EDB' },
        secondary: { main: '#FF5555' }
    },
    typography: {
        useNextVariants: true,
    }
});

class TelegramApp extends Component{
    constructor(props){
        super(props);

        console.log(`Start Telegram Web ${packageJson.version}`);

        this.dialogDetailsRef = React.createRef();

        this.state = {
            authorizationState: null,
            inactive: false,
            mediaViewerContent: ApplicationStore.mediaViewerContent,
        };

        /*this.store = localForage.createInstance({
            name: '/tdlib'
        });*/

        //this.initDB();
    }

    componentWillMount(){
        const { location } = this.props;

        TdLibController.init(location);
    }

    componentDidMount(){
        ApplicationStore.on('updateAuthorizationState', this.onUpdateAuthorizationState);
        ApplicationStore.on('clientUpdateChatDetailsVisibility', this.onUpdateChatDetailsVisibility);
        ApplicationStore.on('clientUpdateMediaViewerContent', this.onUpdateMediaViewerContent);
        TdLibController.on('tdlib_updateAppInactive', this.onUpdateAppInactive);
        TdLibController.on('tdlib_update', this.onUpdate);
    }

    componentWillUnmount(){
        ApplicationStore.removeListener('updateAuthorizationState', this.onUpdateAuthorizationState);
        ApplicationStore.removeListener('clientUpdateChatDetailsVisibility', this.onUpdateChatDetailsVisibility);
        ApplicationStore.removeListener('clientUpdateMediaViewerContent', this.onUpdateMediaViewerContent);
        TdLibController.removeListener('tdlib_updateAppInactive', this.onUpdateAppInactive);
        TdLibController.removeListener('tdlib_update', this.onUpdate);
    }

    onUpdateAuthorizationState = (update) => {
        const { authorization_state } = update;

        this.setState({ authorizationState: authorization_state });

        if (authorization_state) {
            if (authorization_state['@type'] === 'authorizationStateReady'
                || authorization_state['@type'] === 'authorizationStateWaitCode'
                || authorization_state['@type'] === 'authorizationStateWaitPassword'
                || authorization_state['@type'] === 'authorizationStateWaitPhoneNumber') {
                //registerServiceWorker();
            }

            if (authorization_state['@type'] === 'authorizationStateReady') {
                TdLibController
                    .send({
                        '@type': 'setOption',
                        name: 'online',
                        value: { '@type': 'optionValueBoolean', value: true }
                    });
            }
        }
    };

    onUpdateChatDetailsVisibility = (update) => {
        this.setState({ isChatDetailsVisible: ApplicationStore.isChatDetailsVisible });
    };

    onUpdateMediaViewerContent = (content) =>{
        this.setState({ mediaViewerContent: content });
    };

    onUpdateAppInactive = () => {
        this.setState({ inactive : true });
    };

    onUpdate = (update) => {
        // NOTE: important to start init DB after receiving first update
        //FileController.initDB();

        switch (update['@type']) {
            case 'updateFatalError':
                alert('Oops! Something went wrong. We need to refresh this page.');
                window.location.reload();

                break;
            case 'updateServiceNotification':
                const { type, content } = update;

                if (content
                    && content['@type'] === 'messageText') {

                    const { text } = content;
                    if (text
                        && text['@type'] === 'formattedText'
                        && text.text) {
                        switch (type) {
                            case 'AUTH_KEY_DROP_DUPLICATE':
                                let result = window.confirm(text.text);
                                if (result) {
                                    TdLibController.logOut();
                                }
                                break;
                            default:
                                alert(text.text);
                                break;
                        }
                    }
                }

                break;
            default:

                break;
        }
    };

    handleSelectChat = (chatId) => {
        const selectedChatId = ChatStore.getSelectedChatId();
        if (selectedChatId === chatId){
            this.dialogDetailsRef.current.scrollToBottom();
        }
        else{
            ChatStore.setSelectedChatId(chatId);
        }
    };

    handleSelectUser = async (userId) => {
        if (!userId) return;

        let chat = await TdLibController
            .send({
                '@type': 'createPrivateChat',
                user_id: userId,
                force: true
            });

        this.handleSelectChat(chat.id);
    };

    clearCache = () => {
        // this.store.clear()
        //     .then(() => alert('cache cleared'));
    };

    handleChangePhone = () => {
        this.setState({ authorizationState: { '@type': 'authorizationStateWaitPhoneNumber' } });
    };

    render(){
        const { inactive, authorizationState, isChatDetailsVisible, mediaViewerContent } = this.state;

        let page = (
            <>
                <div className={classNames('page', { 'page-third-column': isChatDetailsVisible })}>
                    <Dialogs
                        onClearCache={this.clearCache}
                        onSelectChat={this.handleSelectChat}/>
                    <DialogDetails
                        ref={this.dialogDetailsRef}
                        onSelectChat={this.handleSelectChat}
                        onSelectUser={this.handleSelectUser}/>
                    {
                        isChatDetailsVisible &&
                        <DialogInfo
                            onSelectChat={this.handleSelectChat}
                            onSelectUser={this.handleSelectUser}/>
                    }
                </div>
                <Footer/>
            </>
        );

        if (inactive){
            page = (
                <>
                    <div className='header-wrapper'/>
                    <div className='page'>
                        <AppInactiveControl/>
                    </div>
                    <Footer/>
                </>
            );
        }
        else if (authorizationState){
            switch (authorizationState['@type']){
                case 'authorizationStateClosed': {

                    break;
                }
                case 'authorizationStateClosing': {

                    break;
                }
                case 'authorizationStateLoggingOut': {

                    break;
                }
                case 'authorizationStateReady': {

                    break;
                }
                case 'authorizationStateWaitCode':
                case 'authorizationStateWaitPassword':
                case 'authorizationStateWaitPhoneNumber':
                    page = (
                        <AuthFormControl authorizationState={authorizationState} onChangePhone={this.handleChangePhone}/>
                    );

                    break;
                case 'authorizationStateWaitEncryptionKey': {

                    break;
                }
                case 'authorizationStateWaitTdlibParameters': {

                    break;
                }
            }
        }

        return (
            <MuiThemeProvider theme={theme}>
                <div id='app'>
                    {page}
                    {mediaViewerContent && <MediaViewer {...mediaViewerContent}/>}
                </div>
            </MuiThemeProvider>
        );
    }
}

/*window.onblur = function(){
    TdLibController
        .send({
            '@type': 'setOption',
            name: 'online',
            value: { '@type': 'optionValueBoolean', value: false }
        });
};

window.onfocus = function(){
    TdLibController
        .send({
            '@type': 'setOption',
            name: 'online',
            value: { '@type': 'optionValueBoolean', value: true }
        });
};*/

export default TelegramApp;