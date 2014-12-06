/**
 * @fileoverview About this file
 */

goog.provide('ydn.crm.Ch');
goog.provide('ydn.crm.Ch.Req');
goog.provide('ydn.crm.Ch.SReq');
goog.require('goog.async.Deferred');
goog.require('ydn.msg.Pipe');



/**
 * @constructor
 */
ydn.crm.Ch = function() {

};


/**
 * @final
 * @private
 * @type {Object.<ydn.msg.Pipe>}
 */
ydn.crm.Ch.channels_ = {};


/**
 * Get channel.
 * @param {string} name
 * @return {ydn.msg.Pipe}
 * @deprecated use ydn.msg instead
 */
ydn.crm.Ch.getChannel = function(name) {
  return ydn.crm.Ch.channels_[name];
};


/**
 * List channels, excluding main channel.
 * @return {Array.<string>}
 */
ydn.crm.Ch.list = function() {
  return Object.keys(/** @type {!Object} */ (ydn.crm.Ch.channels_));
};


/**
 * Request to background thread.
 * @enum {string}
 */
ydn.crm.Ch.Req = {
  APP_SETTING: 'app-setting',
  ACK: 'ack', // acknowledge message
  BADGE_UPDATE: 'badge-update', // update browser action logo
  CLOSE: 'close',
  DNT_ADD: 'dnt-add',
  DNT_QUERY: 'dnt-query',
  DNT_REMOVE: 'dnt-remove',
  EXPORT_RECORD: 'export-record',
  ECHO: 'echo',
  FEED_LOG: 'feed-log', // list of log
  FEED_LOG_INFO: 'feed-log-info', // list of info log
  GDATA_UPDATE: 'gdata-update',  // update from server
  GDATA_CONTACT_MERGE: 'gdcm', // merge contact data
  GDATA_LIST_CONTACT: 'gdata-list-contact', // list by 'email' or 'externalid'
  GDATA_TOKEN: 'gdata-token', //
  GDATA_TOKEN_REVOKE: 'gdata-token-revoke',
  LIST_SUGAR: 'list-sugarcrm', // list sugarcrm about
  LIST_SUGAR_DOMAIN: 'list-sugarcrm-domain', // list sugarcrm domain
  LOG: 'log', // log bug
  LOGIN_INFO: 'login-info', // google user info, email and id
  LOGGED_IN: 'logged-in', // has been logged to server.
  LOGGED_OUT: 'logged-out',
  NEW_ENTRY: 'new-entry',
  NEW_SUGAR: 'new-sugarcrm', // create a new sugar channel, if not already exist.
  NUKE: 'nk', // clear db
  REMOVE_SUGAR: 'remove-sugar',
  REQUEST: 'request', // send request to database
  REQUEST_HOST_PERMISSION: 'request-host-permission',
  SERVER_AUDIT_LOG: 'server-audit-log',
  SOCIAL_PROFILE: 'social-profile',
  SUGAR_SERVER_INFO: 'sugar-server-info',
  TRACKING_SELF_OPEN: 'tracking-self-open', // notify self access
  TRACKING_QUERY: 'tracking-query',
  TRACKING_UPDATE: 'tracking-update'
};


/**
 * Broadcast requests.
 * @enum {string}
 */
ydn.crm.Ch.BReq = {
  // LIST_DOMAINS: 'list-sugarcrm-domains', // list of domain name of sugarcrm
  HOST_PERMISSION: 'host-permission',
  SUGARCRM: 'sugarcrm', // changes in sugarcrm instance. login, logout
  LOGGED_OUT: 'logout',
  LOGGED_IN: 'login',
  NEW_TRACKING_POINT: 'new-tracing-point'
};


/**
 * Request to background thread for specific sugarcrm.
 * @enum {string}
 */
ydn.crm.Ch.SReq = {
  ABOUT: 'about', // return domain, username
  ACTIVITY_STREAM: 'activity-stream',
  ACTIVITY_UPCOMING: 'activity-upcoming',
  DELETE_RECORD: 'delete-record', //
  DETAILS: 'details',
  FETCH_MODULE: 'fetch-module', // fetch module entries
  GET: 'get', // get module entry
  IMPORT_GDATA: 'import-gdata',
  INFO_MODULE: 'info-module', // list module field
  KEYS: 'keys', // list keys
  /**
   * @desc link contact gdata with sugar record by ExternalId attribute.
   * @see #UNLINK
   */
  LINK: 'link',
  LIST: 'list',  // list records (all module) by an email.
  LIST_MODULE: 'list-module',
  LOGIN: 'login',
  LOGIN_USER: 'login-user', // current login user record (Users module)
  NEW_RECORD: 'new-record', // create a new record
  PUT_RECORD: 'put-record', //
  QUERY: 'query',
  REST: 'rest', // SugarCRM REST request
  SEARCH: 'search', // free text query
  SERVER_INFO: 'server-info',
  STATS: 'stats', // statistic of cached data
  SYNC_ENTRY: 'sync-entry',
  /**
   * @desc remove ExternalId that link contact gdata with sugar record.
   * @see #LINK
   */
  UNLINK: 'unlink',
  VALUES: 'values' // record values query
};

