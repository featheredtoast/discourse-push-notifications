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
  bannerDismissed: false,
  @computed
  showPushNotification() {
    return (this.siteSettings.push_notifications_enabled &&
            this.siteSettings.push_notifications_prompt &&
              isPushNotificationsSupported() && this.currentUser
            );
  },

  @computed
  pushNotificationSubscribed: {
    set(value) {
      const user = this.currentUser;
      pushNotificationKeyValueStore.setItem(pushNotificationUserSubscriptionKey(user), value);
      return pushNotificationKeyValueStore.getItem(pushNotificationUserSubscriptionKey(user));
    },
    get() {
      return pushNotificationKeyValueStore.getItem(pushNotificationUserSubscriptionKey(Discourse.User.current()));
    }
  },

  @computed("pushNotificationSubscribed")
  instructions(pushNotificationSubscribed) {
    if (pushNotificationSubscribed) {
      return I18n.t("discourse_push_notifications.disable_note");
    } else {
      return I18n.t("discourse_push_notifications.enable_note");
    }
  },

  actions: {
    subscribe() {
      subscribePushNotification(() => {
        desktopNotificationkeyValueStore.setItem('notifications-disabled', 'disabled');
        unsubscribeToNotificationAlert(this.messageBus, this.currentUser);
        this.set("pushNotificationSubscribed", 'subscribed');
      }, this.siteSettings.vapid_public_key_bytes);
    },
    dismiss() {
      this.set("bannerDismissed", true);
    }
  }
});
