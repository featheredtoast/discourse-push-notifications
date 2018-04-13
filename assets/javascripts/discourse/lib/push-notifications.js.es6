import { ajax } from 'discourse/lib/ajax';
import KeyValueStore from 'discourse/lib/key-value-store';
import {
  context as desktopNotificationContext,
  unsubscribe as unsubscribeToDesktopNotifications,
  hide as hideDesktopNotifications
} from 'discourse/lib/desktop-notifications';

export const keyValueStore = new KeyValueStore("discourse_push_notifications_");

export function userSubscriptionKey(user) {
  return `subscribed-${user.get('id')}`;
}

export function userDismissedPrompt(user) {
  return `dismissed-prompt-${user.get('id')}`;
}

function sendSubscriptionToServer(subscription, sendConfirmation) {
  ajax('/push_notifications/subscribe', {
    type: 'POST',
    data: { subscription: subscription.toJSON(), send_confirmation: sendConfirmation }
  });
}

function userAgentVersionChecker(agent, version, mobileView) {
  const uaMatch = navigator.userAgent.match(new RegExp(`${agent}\/(\\d+)\\.\\d`));
  if (uaMatch && mobileView) return false;
  if (!uaMatch || parseInt(uaMatch[1]) < version) return false;
  return true;
}

function resetIdle() {
  if('controller' in navigator.serviceWorker) {
    navigator.serviceWorker.controller.postMessage({lastAction: Date.now()});
  }
}

function setupActivityListeners(appEvents) {
  window.addEventListener("focus", resetIdle);

  if (document) {
    document.addEventListener("scroll", resetIdle);
  }

  appEvents.on('page:changed', resetIdle);
}

function disableDesktopNotifications(messageBus, currentUser) {
  const desktopNotificationkeyValueStore = new KeyValueStore(desktopNotificationContext);
  desktopNotificationkeyValueStore.setItem('notifications-disabled', 'disabled');
  hideDesktopNotifications();
  unsubscribeToDesktopNotifications(messageBus, currentUser);
}

export function isPushNotificationsSupported(mobileView) {
  if (!(('serviceWorker' in navigator) &&
     (ServiceWorkerRegistration &&
     (typeof(Notification) !== "undefined") &&
     ('showNotification' in ServiceWorkerRegistration.prototype) &&
     ('PushManager' in window)))) {

    return false;
  }

  if ((!userAgentVersionChecker('Firefox', 44, mobileView)) &&
     (!userAgentVersionChecker('Chrome', 50))) {
    return false;
  }

  return true;
}

export function register(user, mobileView, router, appEvents, messageBus) {
  if (!isPushNotificationsSupported(mobileView)) return;
  //disable desktop notifications here
  if(Discourse.SiteSettings.push_notifications_enabled) {
    disableDesktopNotifications(messageBus, user);
  }
  if (Notification.permission === 'denied' || !user) return;

  navigator.serviceWorker.ready.then(serviceWorkerRegistration => {
    serviceWorkerRegistration.pushManager.getSubscription().then(subscription => {
      if (subscription) {
        sendSubscriptionToServer(subscription, false);
        // Resync localStorage
        keyValueStore.setItem(userSubscriptionKey(user), 'subscribed');
      }
    }).catch(e => Ember.Logger.error(e));
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if ('url' in event.data) {
      const url = event.data.url;
      router.handleURL(url);
    }
  });
  setupActivityListeners(appEvents);
}

export function subscribe(callback, applicationServerKey) {
  if (!isPushNotificationsSupported()) return;

  navigator.serviceWorker.ready.then(serviceWorkerRegistration => {
    serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array(applicationServerKey.split("|")) // eslint-disable-line no-undef
    }).then(subscription => {
      sendSubscriptionToServer(subscription, true);
      if (callback) callback();
    }).catch(e => Ember.Logger.error(e));
  });
}

export function unsubscribe(callback) {
  if (!isPushNotificationsSupported()) return;

  navigator.serviceWorker.ready.then(serviceWorkerRegistration => {
    serviceWorkerRegistration.pushManager.getSubscription().then(subscription => {
      if (subscription) {
        subscription.unsubscribe().then((successful) => {
          if (successful) {
            ajax('/push_notifications/unsubscribe', {
              type: 'POST',
              data: { subscription: subscription.toJSON() }
            });
          }
        });
      }
    }).catch(e => Ember.Logger.error(e));

    if (callback) callback();
  });
}
