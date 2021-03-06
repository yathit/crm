// Copyright 2015 YDN Authors. All Rights Reserved.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.


/**
 * @fileoverview SugarCRM app.
 *
 * SugarCRM app is responsible for instantiating SugarCRM related root component
 * and manage SugarCRM model that connect with the background page.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.crm.inj.SugarCrmApp');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.style');
goog.require('ydn.crm.base');
goog.require('ydn.crm.gmail.ComposeArchiver');
goog.require('ydn.crm.gmail.Template');
goog.require('ydn.crm.shared');
goog.require('ydn.crm.su.Archiver');
goog.require('ydn.crm.su.AttachButtonProvider');
goog.require('ydn.crm.su.ContextWidget');
goog.require('ydn.crm.su.ui.DesktopHome');
goog.require('ydn.crm.su.ui.ModulePage');
goog.require('ydn.crm.su.ui.RecordList');
goog.require('ydn.crm.su.ui.RecordPage');
goog.require('ydn.crm.su.ui.SettingPage');
goog.require('ydn.crm.su.ui.search.Page');
goog.require('ydn.crm.ui.Desktop');
goog.require('ydn.gmail.Utils.GmailViewState');
goog.require('ydn.msg.Pipe');



/**
 * SugarCRM app.
 * @param {ydn.crm.ui.UserSetting} us
 * @param {ydn.crm.gmail.MessageHeaderInjector} heading_injector
 * @param {ydn.crm.gmail.GmailObserver} gmail_observer
 * @param {ydn.crm.gmail.ComposeObserver} compose_observer
 * @constructor
 * @struct
 */
ydn.crm.inj.SugarCrmApp = function(us, heading_injector, gmail_observer,
                                   compose_observer) {

  /**
   * @private
   * @type {ydn.crm.ui.UserSetting}
   */
  this.us_ = us;
  /**
   * @type {ydn.crm.gmail.GmailObserver}
   * @private
   */
  this.gmail_observer_ = gmail_observer;

  /**
   * @type {ydn.crm.gmail.ComposeObserver}
   * @private
   */
  this.compose_observer_ = compose_observer;
  /**
   * @type {?ydn.crm.su.AttachButtonProvider}
   * @private
   */
  this.attacher_ = null;
  /**
   * @final
   * @type {ydn.crm.gmail.MessageHeaderInjector}
   * @private
   */
  this.heading_injector_ = heading_injector;

  /**
   * @protected
   * @type {ydn.crm.su.ContextWidget}
   */
  this.context_panel = new ydn.crm.su.ContextWidget(us, gmail_observer);

  /**
   * @type {ydn.crm.gmail.Template}
   * @private
   */
  this.gmail_template_ = null;

  /**
   * @final
   * @type {ydn.crm.su.ui.DesktopHome}
   * @protected
   */
  this.sugar_home = new ydn.crm.su.ui.DesktopHome();

  /**
   * @final
   * @type {ydn.crm.su.ui.ModulePage}
   * @protected
   */
  this.record_list_panel = new ydn.crm.su.ui.ModulePage();
  /**
   * @final
   * @type {ydn.crm.su.ui.SettingPage}
   * @protected
   */
  this.setting_page = new ydn.crm.su.ui.SettingPage();

  /**
   * @final
   * @type {ydn.crm.su.ui.RecordPage}
   * @protected
   */
  this.new_record = new ydn.crm.su.ui.RecordPage();

  /**
   * @final
   * @type {ydn.crm.su.ui.search.Page}
   * @protected
   */
  this.search_page = new ydn.crm.su.ui.search.Page();

  /**
   * @protected
   * @type {ydn.crm.gmail.ComposeArchiver}
   */
  this.archive_compose = null;

  this.handler = new goog.events.EventHandler(this);

  /**
   * Current sugarcrm domain.
   * @type {string}
   * @private
   */
  this.domain_ = '';

  /**
   * @type {goog.async.Deferred}
   * @private
   */
  this.df_update_ = null;

};


/**
 * @define {boolean} debug flag.
 */
ydn.crm.inj.SugarCrmApp.DEBUG = false;


/**
 * Sniff contact and set to model.
 * @param {ydn.crm.su.events.RecordViewEvent} e
 * @private
 */
ydn.crm.inj.SugarCrmApp.prototype.onViewRecord_ = function(e) {
  if (ydn.crm.inj.SugarCrmApp.DEBUG) {
    window.console.log('view record ' + e.module + ':' + e.id);
  }
  // this.sugar_home.showRecord(e.module, e.id);

};


/**
 * @param {ydn.msg.Event} e
 * @protected
 */
ydn.crm.inj.SugarCrmApp.prototype.handleSugarDomainChanges = function(e) {
  if (!this.df_update_) {
    ydn.crm.msg.Manager.addStatus('Updating SugarCRM instance changes.');
    this.df_update_ = this.updateSugarPanels_();
    this.df_update_.addBoth(function() {
      this.df_update_ = null;
    }, this);
  }
};


/**
 * Initialize UI.
 * @param {ydn.crm.ui.Desktop} desktop
 * @param {ydn.crm.inj.ContextContainer} renderer
 */
ydn.crm.inj.SugarCrmApp.prototype.init = function(desktop, renderer) {

  desktop.getHomePage().addChild(this.sugar_home, true);
  desktop.addChild(this.record_list_panel, true);
  desktop.addChild(this.search_page, true);
  desktop.addChild(this.new_record, true);
  desktop.addChild(this.setting_page, true);

  this.context_panel.render(renderer.getContentElement());

  goog.events.listen(this.us_,
      [ydn.crm.ui.UserSetting.EventType.LOGIN,
        ydn.crm.ui.UserSetting.EventType.LOGOUT],
      this.onUserStatusChange, false, this);

  goog.events.listen(ydn.msg.getMain(),
      [ydn.crm.ch.BReq.SUGARCRM],
      this.handleSugarDomainChanges, false, this);

  if (ydn.crm.inj.SugarCrmApp.DEBUG) {
    window.console.info('SugarCrmApp initialized.');
  }

  if (this.us_.isReady()) {
    this.refresh_();
  }
};


/**
 * Reset user setting
 * @param {goog.events.Event} e
 * @protected
 */
ydn.crm.inj.SugarCrmApp.prototype.onUserStatusChange = function(e) {
  if (ydn.crm.inj.SugarCrmApp.DEBUG) {
    window.console.log('updating for ' + e.type);
  }
  this.refresh_();
};


/**
 * @private
 */
ydn.crm.inj.SugarCrmApp.prototype.refresh_ = function() {
  if (this.us_.hasValidLogin()) {
    this.sugar_home.setVisible(true);
    this.updateSugarPanels_();
  } else {
    // we are not showing any UI if user is not login.
    // user should use browser bandage to login and refresh the page.
    this.heading_injector_.setSugar(null);
    this.sugar_home.setVisible(false);
    this.updateSugarPanels_();
  }
};


/**
 * @param {SugarCrm.Details} details
 * @private
 */
ydn.crm.inj.SugarCrmApp.prototype.updateSugarCrm_ = function(details) {

  if (ydn.crm.inj.SugarCrmApp.DEBUG) {
    window.console.info('Updating Sugar from ' + this.domain_, details);
  }

  if (details) {
    if (details.about.domain == this.domain_) {
      return;
    }
    for (var i = 0; i < details.modulesInfo.length; i++) {
      ydn.crm.su.fixSugarCrmModuleMeta(details.modulesInfo[i]);
    }
    this.domain_ = details.about.domain;

    this.sugar_home.setSugarCrm(details);

    var ac = this.us_.getLoginEmail();
    var sugar = new ydn.crm.su.model.GDataSugar(details.about,
        details.modulesInfo, ac, details.serverInfo);
    if (this.attacher_) {
      this.handler.unlisten(this.attacher_,
          ydn.crm.su.events.EventType.VIEW_RECORD,
          this.onViewRecord_);
      this.attacher_.dispose();
    }
    if (this.gmail_template_) {
      this.gmail_template_.dispose();
      this.gmail_template_ = null;
    }
    if (this.archive_compose) {
      this.archive_compose.dispose();
      this.archive_compose = null;
    }

    this.attacher_ = new ydn.crm.su.AttachButtonProvider(this.us_, sugar,
        this.gmail_observer_);
    this.handler.listen(this.attacher_,
        ydn.crm.su.events.EventType.VIEW_RECORD,
        this.onViewRecord_);

    // todo: archiver is not release
    var archiver = new ydn.crm.su.Archiver(this.us_, sugar, this.attacher_);
    this.heading_injector_.setSugar(archiver);
    this.context_panel.setSugarCrm(sugar);
    this.search_page.setSugarCrm(sugar);
    this.new_record.setSugar(sugar);
    this.record_list_panel.setSugar(sugar);
    this.setting_page.setSugar(sugar);
    this.archive_compose = new ydn.crm.gmail.ComposeArchiver(this.us_, sugar, this.compose_observer_);

    if (this.us_.hasFeature(ydn.crm.base.Feature.TEMPLATE)) {
      this.gmail_template_ = new ydn.crm.gmail.Template(sugar);
      this.gmail_template_.setObserver(this.compose_observer_);
    }

  } else {
    this.domain_ = '';
    this.context_panel.setSugarCrm(null);
    this.sugar_home.setSugarCrm(null);
    this.heading_injector_.setSugar(null);
    this.search_page.setSugarCrm(null);
    this.new_record.setSugar(null);
    this.record_list_panel.setSugar(null);
    this.setting_page.setSugar(null);
    if (this.attacher_) {
      this.handler.unlisten(this.attacher_,
          ydn.crm.su.events.EventType.VIEW_RECORD,
          this.onViewRecord_);
      this.attacher_.dispose();
    }
    if (this.gmail_template_) {
      this.gmail_template_.dispose();
      this.gmail_template_ = null;
    }
    if (this.archive_compose) {
      this.archive_compose.dispose();
      this.archive_compose = null;
    }
  }

};


/**
 * Update sugar panels.
 * @return {goog.async.Deferred}
 * @private
 */
ydn.crm.inj.SugarCrmApp.prototype.updateSugarPanels_ = function() {

  return ydn.msg.getChannel().send(ydn.crm.ch.Req.GET_SUGAR).addCallbacks(
      function(x) {
        var details = /** @type {SugarCrm.Details} */ (x);
        this.updateSugarCrm_(details);
      }, function(e) {
        window.console.error(e);
      }, this);
};




