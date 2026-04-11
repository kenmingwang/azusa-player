import { parseContextTarget, type ContextTargetPayload } from '../../utils/searchSource';

const sendContextTargetChange = (payload: ContextTargetPayload) => {
  try {
    chrome.runtime.sendMessage(
      {
        type: 'context-target-change',
        data: payload,
      },
      () => {
        chrome.runtime.lastError;
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    if (!message.includes('Extension context invalidated')) {
      console.debug('[azusa-player][content-script] sendMessage failed', error);
    }
  }
};

document.addEventListener(
  'contextmenu',
  (event) => {
    const payload = parseContextTarget(event.target instanceof Element ? event.target : null, window.location.href);
    sendContextTargetChange(payload);
  },
  true,
);

export {}; // stops ts error that the file isn't a module
