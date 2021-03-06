// Copyright 2014 YDN Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview Main application for injecting content script to gmail.
 *
 * As soon as the app run, this connect with background script, create stable
 * connection channel and check login status and load of the user
 * setting. Finally this will load Gmail content panel and listen gmail history
 * changes. These changes are regularily updated back to Gmail content panel.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.crm.inj.App');
goog.require('goog.dom');
goog.require('goog.style');
goog.require('ydn.crm.base');
goog.require('ydn.crm.gmail.GmailObserver');
goog.require('ydn.crm.inj.BackgroundLogger');
goog.require('ydn.crm.inj.BugReporter');
goog.require('ydn.crm.inj.GmailContextContainer');
goog.require('ydn.crm.inj.SugarCrmApp');
goog.require('ydn.crm.inj.TrackingApp');
goog.require('ydn.crm.msg.Manager');
goog.require('ydn.crm.shared');
goog.require('ydn.crm.ui.CacheUpdateDisplay');
goog.require('ydn.crm.ui.Desktop');
goog.require('ydn.cs.ReplyPanelManager');
goog.require('ydn.debug');
goog.require('ydn.gmail.Utils.GmailViewState');
goog.require('ydn.msg.Pipe');
goog.require('ydn.social.ui.SocialWidget');



/**
 * Main Gmail content script app.
 * @constructor
 * @struct
 */
ydn.crm.inj.App = function() {

  // connection channel with background page.
  ydn.msg.initPipe(ydn.msg.ChannelName.CONTENT_SCRIPT);

  ydn.crm.msg.Manager.addStatus('Starting ' + ydn.crm.version + '...');
  /**
   * @type {ydn.crm.ui.UserSetting}
   * @final
   */
  this.us = /** @type {ydn.crm.ui.UserSetting} */ (ydn.crm.ui.UserSetting.getInstance());
  /**
   * @final
   * @type {ydn.crm.gmail.GmailObserver}
   */
  this.gmail_observer = new ydn.crm.gmail.GmailObserver(this.us.getLoginEmail());

  /**
   * @final
   * @type {ydn.crm.gmail.ComposeObserver}
   */
  this.compose_observer = new ydn.crm.gmail.ComposeObserver(this.gmail_observer);

  /**
   * @type {ydn.crm.gmail.MessageHeaderInjector}
   * @private
   */
  this.header_injector_ = new ydn.crm.gmail.MessageHeaderInjector(this.gmail_observer);

  /**
   * @final
   * @type {ydn.crm.inj.GmailContextContainer}
   */
  this.context_container = new ydn.crm.inj.GmailContextContainer(this.gmail_observer);

  /**
   * @final
   * @type {ydn.cs.ReplyPanelManager}
   */
  this.reply_panel_manager = new ydn.cs.ReplyPanelManager(this.gmail_observer);

  /**
   * @final
   * @type {ydn.crm.inj.Hud}
   */
  this.hud = new ydn.crm.inj.Hud();

  /**
   * @final
   * @type {ydn.crm.ui.Desktop}
   */
  this.desktop = new ydn.crm.ui.Desktop();

  /**
   * @protected
   * @type {ydn.crm.inj.SugarCrmApp}
   */
  this.sugar_app = null;

  /**
   * @protected
   * @type {ydn.crm.inj.TrackingApp}
   */
  this.tracking_app = null;

  /**
   * @protected
   * @type {ydn.social.ui.SocialWidget}
   */
  this.social_app = null;

  /**
   * @type {boolean}
   * @private
   */
  this.features_loaded_ = false;
};


/**
 * @define {boolean} debug flag.
 */
ydn.crm.inj.App.DEBUG = false;


/**
 * @protected
 * @type {goog.log.Logger}
 */
ydn.crm.inj.App.prototype.logger = goog.log.getLogger('ydn.crm.inj.App');


/**
 * @param {goog.events.Event} e
 * @private
 */
ydn.crm.inj.App.prototype.handleUserLogin_ = function(e) {
  var us = /** @type {ydn.crm.ui.UserSetting} */ (ydn.crm.ui.UserSetting.getInstance());
  goog.log.fine(this.logger, 'handling user login');
  if (us.isLogin()) {
    if (us.hasValidLogin()) {
      this.gmail_observer.setEnabled(true);
      this.context_container.setEnabled(true);
    } else {
      this.gmail_observer.setEnabled(false);
      this.context_container.setEnabled(false);
    }
    this.gmail_observer.setLoginEmail(us.getLoginEmail());

  } else {
    this.gmail_observer.setEnabled(false);
    this.context_container.setEnabled(false);
  }
};


/**
 * Init UI.
 * @return {!goog.async.Deferred} when user is ready.
 */
ydn.crm.inj.App.prototype.init = function() {
  goog.log.fine(this.logger, 'initializing ' + this);

  this.hud.render();
  var scd = new ydn.crm.ui.CacheUpdateDisplay();
  scd.render(this.hud.getFooterElement());
  var us = ydn.crm.ui.UserSetting.getInstance();
  this.hud.addPanel(this.desktop);

  goog.events.listen(us,
      [ydn.crm.ui.UserSetting.EventType.LOGOUT,
        ydn.crm.ui.UserSetting.EventType.LOGIN],
      this.handleUserLogin_, false, this);

  // bug report link in hub footer.
  var bug = new ydn.crm.inj.BugReporter();
  bug.decorate(this.hud.getFooterElement());

  return us.onReady().addCallback(function() {
    this.loadFeatures_();
  }, this);

};


/**
 * Load feature after login.
 * @private
 */
ydn.crm.inj.App.prototype.loadFeatures_ = function() {

  if (this.features_loaded_) {
    return;
  }

  if (YathitCrm.Product.SugarCRM) {
    this.sugar_app = new ydn.crm.inj.SugarCrmApp(this.us, this.header_injector_,
        this.gmail_observer, this.compose_observer);
    goog.log.fine(this.logger, 'initializing sugarcrm app');
    this.sugar_app.init(this.desktop, this.context_container);
  }

  if (YathitCrm.Product.Tracking &&
      this.us.hasFeature(ydn.crm.base.Feature.TRACKING)) {
    this.tracking_app = new ydn.crm.inj.TrackingApp(this.header_injector_,
        this.gmail_observer, this.compose_observer, this.context_container,
        this.reply_panel_manager);
    goog.log.fine(this.logger, 'initializing tracking app');
    this.tracking_app.init(this.desktop);
  }

  if (YathitCrm.Product.Social &&
      this.us.hasFeature(ydn.crm.base.Feature.SOCIAL)) {
    this.social_app = new ydn.social.ui.SocialWidget(this.gmail_observer);
    this.social_app.render(this.context_container.getContentElement());
  }

  this.features_loaded_ = true;
};


/**
 * @inheritDoc
 */
ydn.crm.inj.App.prototype.toString = function() {
  return 'inj.Main:' + ydn.crm.version;
};


/**
 * Main entry script to run the app.
 * @return {ydn.crm.inj.App}
 */
ydn.crm.inj.App.runInjApp = function() {
  ydn.crm.shared.init();

  var app = new ydn.crm.inj.App();

  var svg_url = chrome.extension.getURL(ydn.crm.base.SVG_PAGE);
  ydn.crm.ui.setSvgDoc(svg_url, function() {
    var tmp_url = chrome.extension.getURL(ydn.crm.base.INJ_TEMPLATE);
    ydn.ui.setTemplateDocument(tmp_url, function() {
      var tid2 = window.setTimeout(function() {
        app.init();
      }, 500);
    });
  });

  return app;
};

goog.exportSymbol('runInjApp', ydn.crm.inj.App.runInjApp);

