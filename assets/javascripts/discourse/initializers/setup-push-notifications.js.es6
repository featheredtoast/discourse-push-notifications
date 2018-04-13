import { withPluginApi } from 'discourse/lib/plugin-api';

import {
  register as registerPushNotifications,
  setupActivityListeners
} from 'discourse/plugins/discourse-push-notifications/discourse/lib/push-notifications';

export default {
  name: 'setup-push-notifications',
  initialize(container) {
    withPluginApi('0.1', api => {
      const siteSettings = container.lookup('site-settings:main');
      const router = container.lookup('router:main');
      const site = container.lookup('site:main');
      const appEvents = container.lookup('app-events:main');
      const bus = container.lookup('message-bus:main');

      if (!Ember.testing && siteSettings.push_notifications_enabled) {
        const mobileView = site.mobileView;
        registerPushNotifications(api.getCurrentUser(), mobileView, router, appEvents, bus);
      }
    });
  }
};
