// Copyright 2014 YDN Authors. All Rights Reserved.
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
 * @fileoverview GData contact sync panel.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.crm.sugarcrm.GDataContactPanel');
goog.require('ydn.crm.msg.Manager');
goog.require('ydn.crm.sugarcrm.SyncPanel');
goog.require('ydn.crm.sugarcrm.model.Sugar');
goog.require('ydn.crm.ui');
goog.require('ydn.gdata.Kind');
goog.require('ydn.gdata.m8.ContactEntry');
goog.require('ydn.ui');
goog.require('ydn.ui.FlyoutMenu');



/**
 * GData contact sync panel.
 * @param {ydn.crm.sugarcrm.model.Sugar} m
 * @constructor
 * @struct
 * @extends {ydn.crm.sugarcrm.SyncPanel}
 */
ydn.crm.sugarcrm.GDataContactPanel = function(m) {
  goog.base(this, m);

  /**
   * @private
   */
  this.primary_templ_ =
      ydn.ui.getTemplateById('sync-gdata-primary-template').content;
  /**
   * @private
   */
  this.secondary_templ_ = ydn.ui.getTemplateById(
      'sync-gdata-secondary-template').content;

  /**
   * @type {goog.async.Deferred}
   * @private
   */
  this.render_next_df_ = null;
};
goog.inherits(ydn.crm.sugarcrm.GDataContactPanel, ydn.crm.sugarcrm.SyncPanel);


/**
 * @define {boolean} debug flag
 */
ydn.crm.sugarcrm.GDataContactPanel.DEBUG = true;


/**
 * @override
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.renderContent = function() {
  var ul = this.root.querySelector('UL.infinite-scroll');
  ul.addEventListener('click', this.onContentClick_.bind(this), false);
};


/**
 * @param {Event} ev
 * @private
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.onContentClick_ = function(ev) {

  var name = ydn.ui.FlyoutMenu.handleClick(ev);
  if (name) {
    var li = goog.dom.getAncestorByTagNameAndClass(
        /** @type {Element} */ (ev.target), 'LI');
    var id = li.getAttribute('data-id');
    if (ydn.crm.sugarcrm.GDataContactPanel.DEBUG) {
      window.console.log('import', name, id);
    }
    this.import_(id, /** @type {ydn.crm.sugarcrm.ModuleName} */ (name));
  }

};


/**
 * Import GData contact to sugarcrm record.
 * @param {string} id
 * @param {ydn.crm.sugarcrm.ModuleName} mn
 * @return {!goog.async.Deferred}
 * @private
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.import_ = function(id, mn) {
  var req = ydn.crm.Ch.SReq.IMPORT_GDATA;
  var data = {
    'module': mn,
    'kind': ydn.gdata.Kind.M8_CONTACT,
    'gdata-id': id
  };
  if (ydn.crm.sugarcrm.model.GDataSugar.DEBUG) {
    window.console.info('sending ' + req + ' ' + JSON.stringify(data));
  }
  var sid = id.match(/\w+$/)[0];
  var mid = ydn.crm.msg.Manager.addStatus('Importing Gmail contact ' + sid);
  return this.model.getChannel().send(req, data).addCallbacks(function(data) {
    if (ydn.crm.sugarcrm.GDataContactPanel.DEBUG) {
      window.console.log(data);
    }
    ydn.crm.msg.Manager.setStatus(mid, 'Gmail contact imported to ' + mn + ' ' +
        data['id']);
    var url = this.model.getRecordViewLink(mn, data['id']);
    ydn.crm.msg.Manager.setLink(mid, url, data['id'], 'View in SugarCRM');
    this.refreshEntry_(id);
  }, function(e) {
    ydn.crm.msg.Manager.addStatus(String(e));
  }, this);
};


/**
 * @override
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.renderToolbar = function() {
  var temp_tb = ydn.ui.getTemplateById('sync-gdata-toolbar-template').content;
  this.toolbar.appendChild(temp_tb.cloneNode(true));

  var order_by = this.toolbar.querySelector('select[name=order-by]');
  var direction = this.toolbar.querySelector('select[name=direction]');
  order_by.onchange = this.onOrderChanged_.bind(this);
  direction.onchange = this.onDirChanged_.bind(this);
};


/**
 * @override
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.appendItem = function(prepend,
                                                                   should_remove) {
  var ul = this.root.querySelector('UL.infinite-scroll');
  var id = undefined;
  var rev = this.reverse;
  if (prepend) {
    rev = !rev;
    if (!!ul.firstElementChild) {
      id = ul.firstElementChild.getAttribute('data-key');
    }
  } else {
    if (!!ul.lastElementChild) {
      id = ul.lastElementChild.getAttribute('data-key');
    }
  }
  var size = 1;
  var index = this.order_by;
  var query = {
    'index': index,
    'limit': size,
    'reverse': rev,
    'after': id
  };
  return ydn.msg.getChannel().send(ydn.crm.Ch.Req.GDATA_LIST_CONTACT, query)
      .addCallback(function(arr) {
        if (ydn.crm.sugarcrm.GDataContactPanel.DEBUG) {
          window.console.log(id, arr);
        }
        var dfs = [];
        for (var k = 0; k < arr.length; k++) {
          var item = arr[k];
          var li = this.sync_pair_templ.cloneNode(true).querySelector('li');
          if (prepend && ul.firstElementChild) {
            if (should_remove) {
              ul.removeChild(ul.lastElementChild);
            }
            ul.insertBefore(li, ul.firstElementChild);
          } else {
            if (should_remove) {
              ul.removeChild(ul.firstElementChild);
            }
            ul.appendChild(li);
          }
          var entry = new ydn.gdata.m8.ContactEntry(item);
          var key;
          if (index == 'updated.$t') {
            key = ydn.db.utils.getValueByKeys(item, index);
          } else if (index == 'name') {
            key = entry.getFullName();
          } else {
            key = entry.getId();
          }
          li.setAttribute('data-id', entry.getEntryId());
          li.setAttribute('data-index', index);
          li.setAttribute('data-key', key);
          dfs.push(this.renderEntry_(li, entry));
        }
        return goog.async.DeferredList.gatherResults(dfs);
      }, this);
};


/**
 * @param {Event} e
 * @private
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.onOrderChanged_ = function(e) {
  this.order_by = e.currentTarget.value;
  this.refreshContent();
};


/**
 * @param {Event} e
 * @private
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.onDirChanged_ = function(e) {
  console.log(e);
  if (e.currentTarget.value == 'asc') {
    this.reverse = false;
  } else if (e.currentTarget.value == 'des') {
    this.reverse = true;
  } else {
    throw new Error('direction ' + e.target.value);
  }
  this.refreshContent();
};


/**
 * @protected
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.refreshFooter = function() {
  var query = {
    'kind': ydn.gdata.Kind.M8_CONTACT
  };
  ydn.msg.getChannel().send(ydn.crm.Ch.Req.GDATA_COUNT, query)
      .addCallback(function(cnt) {
        var el = this.toolbar.querySelector('span[name=gdata-contact-count]');
        el.textContent = String(cnt);
      }, this);
};


/**
 * Score range from 0 to 1. 1 being surely match.
 * @typedef {{
 *   score: number,
 *   record: ydn.crm.sugarcrm.Record
 * }}
 */
ydn.crm.sugarcrm.GDataContactPanel.SimilarityResult;


/**
 * @param {string} domain
 * @param {Array<ydn.crm.sugarcrm.GDataContactPanel.SimilarityResult>} arr sorted
 * array by score.
 * @param {SugarCrm.ContactSimilarityResult} res result to put into arr.
 * @private
 */
ydn.crm.sugarcrm.GDataContactPanel.enrichFor_ = function(domain, arr, res) {
  for (var i = 0; i < res.result.length; i++) {
    var record = res.result[i];
    var ex_idx = -1;
    for (var k = 0; k < arr.length; k++) {
      if (arr[k].record.getId() == record.id) {
        ex_idx = k;
        break;
      }
    }
    var score = 0;
    if (res.index == 'ydn$emails') {
      score = 1;
    } else if (res.index == 'ydn$phones') {
      score = 0.5;
    } else {
      score = 0.2; // name
    }
    if (ex_idx == -1) {
      var mn = /** @type {ydn.crm.sugarcrm.ModuleName} */ (res.module);
      var obj = {
        score: score,
        record: new ydn.crm.sugarcrm.Record(domain, mn, record)
      };
      goog.array.binaryInsert(arr, obj, function(a, b) {
        return a.score > b.score ? 1 : -1;
      });
    } else {
      arr[ex_idx].score += score;
    }
  }
};


/**
 * Enrich query result by combining similar records into a bin.
 * @param {string} domain
 * @param {Array<SugarCrm.ContactSimilarityResult>} results
 * @return {Array<ydn.crm.sugarcrm.GDataContactPanel.SimilarityResult>}
 * Results for for each module. Results are order by score with higher score
 * comes first.
 */
ydn.crm.sugarcrm.GDataContactPanel.enrich = function(domain, results) {
  var arr = [];
  for (var i = 0; i < results.length; i++) {
    var res = results[i];
    if (!arr) {
      window.console.warn('Invalid result of module: ' + res.module);
      continue;
    }
    ydn.crm.sugarcrm.GDataContactPanel.enrichFor_(domain, arr, res);
  }
  return arr;
};


/**
 * @const
 * @type {!Array<ydn.ui.FlyoutMenu.ItemOption>}
 */
ydn.crm.sugarcrm.GDataContactPanel.importMenuItems = [{
  label: 'Accounts',
  name: 'Accounts',
  title: 'Import Gmail contact into SugarCRM Account record'
}, {
  label: 'Contacts',
  name: 'Contacts',
  title: 'Import Gmail contact into SugarCRM Contact record'
}, {
  label: 'Leads',
  name: 'Leads',
  title: 'Import Gmail contact into SugarCRM Lead record'
}];


/**
 * Refresh given entry.
 * @param {string} id
 * @private
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.refreshEntry_ = function(id) {
  var ul = this.root.querySelector('.content UL');
  var li = ul.querySelector('li[data-id="' + id + '"]');
  if (!li) {
    window.console.warn('Entry ' + id + ' not in list.');
    return;
  }
  var ch = ydn.msg.getChannel();
  var query = {
    'from': id,
    'limit': 1
  };
  ch.send(ydn.crm.Ch.Req.GDATA_LIST_CONTACT, query).addCallbacks(function(arr) {
    if (ydn.crm.sugarcrm.GDataContactPanel.DEBUG) {
      window.console.log(arr[0]);
    }
    if (!arr[0]) {
      window.console.warn('Entry ' + id + ' not found.');
      return;
    }
    var entry = new ydn.gdata.m8.ContactEntry(arr[0]);
    li.innerHTML = '';
    li.appendChild(this.sync_pair_templ.cloneNode(true));
    this.renderEntry_(li, entry);
  }, function(e) {
    window.console.error(String(e));
  }, this);
};


/**
 * @param {Element} el
 * @param {ydn.gdata.m8.ContactEntry} entry
 * @return {!goog.async.Deferred<number>} return 1.
 * @private
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.renderEntry_ = function(el, entry) {
  var primary = el.querySelector('.primary');
  var secondary = el.querySelector('.secondary');

  primary.appendChild(this.primary_templ_.cloneNode(true));

  var btn_import = primary.querySelector('span[name=import]');
  ydn.ui.FlyoutMenu.decoratePopupMenu(btn_import,
      ydn.crm.sugarcrm.GDataContactPanel.importMenuItems,
      {iconName: 'input', isRightMenu: true});

  var name = primary.querySelector('span[name=name]');
  name.textContent = entry.getFullName();
  var email = primary.querySelector('span[name=emails]');
  email.textContent = entry.getEmails().join(', ');

  var ch = this.model.getChannel();
  var ce = entry.getData();
  return ch.send(ydn.crm.Ch.SReq.QUERY_SIMILAR, ce).addCallback(function(arr) {
    if (ydn.crm.sugarcrm.GDataContactPanel.DEBUG) {
      window.console.log(arr);
    }
    var ip_btn = primary.querySelector('span[name=import]');
    var domain = this.model.getDomain();
    var results = ydn.crm.sugarcrm.GDataContactPanel.enrich(domain, arr);
    for (var i = 0; i < results.length; i++) {
      var res = results[i];
      if (res.score >= 1.0) {
        // consider exact match, and not allow to create a new record,
        // but instead must sync with it.
        ip_btn.setAttribute('disabled', 'disabled');
      }
      var sec_el = this.secondary_templ_.cloneNode(true).firstElementChild;
      var label = sec_el.querySelector('[name=label]');
      label.textContent = res.record.getLabel();
      var m_name = res.record.getModule();
      var id = res.record.getId();
      sec_el.classList.add(m_name);
      sec_el.setAttribute('data-module', m_name);
      sec_el.setAttribute('data-id', id);
      label.href = this.model.getRecordViewLink(m_name, id);
      var icon = sec_el.querySelector('.icon');
      icon.textContent = ydn.crm.sugarcrm.toModuleSymbol(m_name);
      secondary.appendChild(sec_el);
    }
    return 1;
  }, this);
};


/**
 * Maximun number of li.
 * @type {number}
 */
ydn.crm.sugarcrm.GDataContactPanel.MAX_LI = 50;


/**
 * Maximun number of li.
 * @type {number}
 */
ydn.crm.sugarcrm.GDataContactPanel.OVERSHOOT = 3;


/**
 * Render entry if last entry is showing and continue rendering recursively.
 * @private
 * @return {!goog.async.Deferred}
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.renderNextEntryRecursive_ = function() {

  var ul = this.root.querySelector('.content UL');
  var id = undefined;
  if (ul.childElementCount > ydn.crm.sugarcrm.GDataContactPanel.OVERSHOOT) {
    var li = ul.children[ul.childElementCount - ydn.crm.sugarcrm.GDataContactPanel.OVERSHOOT - 1];
    if (!ydn.dom.isElementVisible(li)) {
      if (ydn.crm.sugarcrm.GDataContactPanel.DEBUG) {
        window.console.log(li.getAttribute('data-id'), ' not visible');
      }
      return goog.async.Deferred.fail(0);
    }
    id = ul.lastElementChild.getAttribute('data-key');
  }
  if (ydn.crm.sugarcrm.GDataContactPanel.DEBUG) {
    window.console.log('rendering next entry');
  }
  if (ul.childElementCount > ydn.crm.sugarcrm.GDataContactPanel.MAX_LI) {
    ul.removeChild(ul.firstElementChild);
  }
  var index = this.order_by;
  var query = {
    'index': index,
    'limit': 1,
    'reverse': this.reverse,
    'after': id
  };
  return ydn.msg.getChannel().send(ydn.crm.Ch.Req.GDATA_LIST_CONTACT, query)
      .addCallback(function(arr) {
        if (ydn.crm.sugarcrm.GDataContactPanel.DEBUG) {
          window.console.log(arr[0]);
        }
        if (arr[0]) {
          var li = this.sync_pair_templ.cloneNode(true).querySelector('li');
          ul.appendChild(li);
          var entry = new ydn.gdata.m8.ContactEntry(arr[0]);
          var key;
          if (index == 'updated.$t') {
            key = ydn.db.utils.getValueByKeys(arr[0], index);
          } else if (index == 'name') {
            key = entry.getFullName();
          } else {
            key = entry.getId();
          }
          li.setAttribute('data-id', entry.getEntryId());
          li.setAttribute('data-index', index);
          li.setAttribute('data-key', key);
          return this.renderEntry_(li, entry).addCallback(function() {
            return this.renderNextEntryRecursive_().addBoth(function(cnt) {
              return cnt + 1;
            }, this);
          }, this);
        }
      }, this);
};


/**
 * Iteratively render resulting gdata contact entry.
 * @param {Array<!ContactEntry>} arr
 * @param {number} idx
 * @return {!goog.async.Deferred<number>}
 * @private
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.renderNextEntry_ = function(arr, idx) {
  if (!arr[idx]) {
    return goog.async.Deferred.succeed(0);
  }
  var ul = this.root.querySelector('.content UL');
  var li = this.sync_pair_templ.cloneNode(true).querySelector('li');
  ul.appendChild(li);
  var entry = new ydn.gdata.m8.ContactEntry(arr[idx]);
  var key;
  var index = this.order_by;
  if (index == 'updated.$t') {
    key = ydn.db.utils.getValueByKeys(arr[idx], index);
  } else if (index == 'name') {
    key = entry.getFullName();
  } else {
    key = entry.getId();
  }
  li.setAttribute('data-id', entry.getEntryId());
  li.setAttribute('data-index', index);
  li.setAttribute('data-key', key);
  return this.renderEntry_(li, entry).addCallback(function() {
    idx++;
    return this.renderNextEntry_(arr, idx).addBoth(function(cnt) {
      return cnt + 1;
    }, this);
  }, this);
};


/**
 * @override
 */
ydn.crm.sugarcrm.GDataContactPanel.prototype.refreshContent = function() {
  var ul = this.root.querySelector('.content UL');
  ul.innerHTML = '';

  var index = this.order_by;
  var query = {
    'index': index,
    'limit': 20,
    'reverse': this.reverse
  };
  ydn.msg.getChannel().send(ydn.crm.Ch.Req.GDATA_LIST_CONTACT, query)
      .addCallback(function(arr) {
        if (ydn.crm.sugarcrm.GDataContactPanel.DEBUG) {
          window.console.log(arr);
        }
        this.renderNextEntry_(arr, 0);
      }, this);

};
