import { default as computed } from 'ember-addons/ember-computed-decorators';

import {
  subscribe as subscribePushNotification,
  unsubscribe as unsubscribePushNotification,
  isPushNotificationsSupported,
  keyValueStore as pushNotificationKeyValueStore,
  userSubscriptionKey as pushNotificationUserSubscriptionKey
} from 'discourse/plugins/discourse-push-notifications/discourse/lib/push-notifications';

import {
  context,
  unsubscribe as unsubscribeToNotificationAlert
} from 'discourse/lib/desktop-notifications';

import KeyValueStore from 'discourse/lib/key-value-store';
const desktopNotificationkeyValueStore = new KeyValueStore(context);

export default Ember.Component.extend({
  @computed
  showPushNotification() {
    return (this.siteSettings.push_notifications_enabled &&
              isPushNotificationsSupported()
            );
  },

  @computed
  isDeniedPermission() {
    return Notification.permission === "denied";
  },

  @computed
  isSubscribed: {
    set(value) {
      const user = this.currentUser;
      pushNotificationKeyValueStore.setItem(pushNotificationUserSubscriptionKey(user), value);
      return pushNotificationKeyValueStore.getItem(pushNotificationUserSubscriptionKey(user));
    },
    get() {
      return pushNotificationKeyValueStore.getItem(pushNotificationUserSubscriptionKey(Discourse.User.current()));
    }
  },

  @computed("isDeniedPermission", "isSubscribed")
  isAvailable(isDeniedPermission, isSubscribed) {
    return !isDeniedPermission && !isSubscribed;
  },

  actions: {
    subscribe() {
      subscribePushNotification(() => {
        desktopNotificationkeyValueStore.setItem('notifications-disabled', 'disabled');
        unsubscribeToNotificationAlert(this.messageBus, this.currentUser);
        this.set("isSubscribed", 'subscribed');
      }, this.siteSettings.vapid_public_key_bytes);
    },

    unsubscribe() {
      unsubscribePushNotification(() => {
        this.set("isSubscribed", '');
      });
    }
  }
});
