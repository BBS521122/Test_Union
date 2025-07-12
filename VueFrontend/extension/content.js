// content.js - Content script that acts as a bridge between the web page and background script
console.log('content script loaded');
(function() {
    'use strict';

    // Inject the script into the page context
    function injectScript() {
        console.log('Injecting script...');
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected_script.js');
        script.onload = function() {
            console.log('Script injected successfully!');
            this.remove();
        };
        script.onerror = () => console.error('Script injection failed!');
        (document.head || document.documentElement).appendChild(script);
    }

    // Listen for messages from the injected script
    window.addEventListener('message', function(event) {
        // Only accept messages from the same origin
        if (event.source !== window) return;

        if (event.data.type && event.data.type === 'FROM_PAGE') {
            // Forward the message to the background script
            chrome.runtime.sendMessage({
                action: event.data.action,
                data: event.data.data
            }).then(response => {
                // Send response back to the page
                window.postMessage({
                    type: 'FROM_CONTENT_SCRIPT',
                    action: event.data.action,
                    response: response,
                    requestId: event.data.requestId
                }, '*');
            }).catch(error => {
                // Send error back to the page
                window.postMessage({
                    type: 'FROM_CONTENT_SCRIPT',
                    action: event.data.action,
                    error: error.message,
                    requestId: event.data.requestId
                }, '*');
            });
        }
    });

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Forward events to the page
        window.postMessage({
            type: 'FROM_BACKGROUND',
            action: message.action,
            data: message.data
        }, '*');
        // 兼容部分扩展消息格式
        if (message.type === 'recordingStarted' || message.type === 'recordingStopped' || message.type === 'error') {
            window.postMessage({
                type: 'FROM_BACKGROUND',
                action: message.type,
                data: message.data
            }, '*');
        }
    });

    // Inject the script when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectScript);
    } else {
        injectScript();
    }
})();

