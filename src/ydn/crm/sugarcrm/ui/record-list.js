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
 * @fileoverview Record snippet shows a brief description of the record.
 *
 * Upon hovering over the pane, an editable record panel appear on the side
 * of snippet panel.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.crm.su.ui.RecordList');
goog.require('goog.ui.Component');
goog.require('ydn.crm.msg.Manager');
goog.require('ydn.crm.su');
goog.require('ydn.crm.su.ui.RecordListProvider');
goog.require('ydn.crm.su.ui.UpdateOptionDialog');
goog.require('ydn.crm.su.ui.record.HoverCard');
goog.require('ydn.crm.templ');
goog.require('ydn.crm.ui.events');



/**
 * Record snippet shows a brief description of the record.
 * @param {ydn.crm.su.ui.RecordListProvider} model
 * @param {goog.dom.DomHelper=} opt_dom
 * @constructor
 * @struct
 * @extends {goog.ui.Component}
 */
ydn.crm.su.ui.RecordList = function(model, opt_dom) {
  goog.base(this, opt_dom);
  this.setModel(model);

  /**
   * @type {goog.async.Deferred}
   * @private
   */
  this.df_load_forward_ = null;

  /**
   * @type {goog.async.Deferred}
   * @private
   */
  this.df_load_back_ = null;
};
goog.inherits(ydn.crm.su.ui.RecordList, goog.ui.Component);


/**
 * @protected
 * @type {goog.log.Logger}
 */
ydn.crm.su.ui.RecordList.prototype.logger =
    goog.log.getLogger('ydn.crm.su.ui.RecordList');


/**
 * @define {boolean} debug flag.
 */
ydn.crm.su.ui.RecordList.DEBUG = false;


/**
 * @return {ydn.crm.su.ui.RecordListProvider}
 * @override
 */
ydn.crm.su.ui.RecordList.prototype.getModel;


/**
 * @const
 * @type {string}
 */
ydn.crm.su.ui.RecordList.CSS_CLASS = 'module-record-list';


/**
 * @return {string}
 */
ydn.crm.su.ui.RecordList.prototype.getCssClass = function() {
  return ydn.crm.su.ui.RecordList.CSS_CLASS;
};


/**
 * @inheritDoc
 */
ydn.crm.su.ui.RecordList.prototype.createDom = function() {
  goog.base(this, 'createDom');
  var root = this.getElement();
  root.classList.add(this.getCssClass());
  var dom = this.getDomHelper();
  var ul = dom.createDom('ul');
  root.appendChild(ul);

  var footer = dom.createDom('div', ydn.crm.ui.CSS_CLASS_FOOTER);
  root.appendChild(footer);
};


/**
 * @inheritDoc
 */
ydn.crm.su.ui.RecordList.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var hd = this.getHandler();
  var ul = this.getUlElement();
  var footer = this.getElement().querySelector('.' + ydn.crm.ui.CSS_CLASS_FOOTER);
  hd.listen(ul, goog.events.EventType.WHEEL, this.onMouseWheel_);
  hd.listen(ul, goog.events.EventType.CLICK, this.onClick_);
  hd.listen(footer, goog.events.EventType.CLICK, this.onFooterClick_);

  hd.listen(ydn.msg.getMain(), ydn.crm.ch.BReq.SUGARCRM_CACHE_FETCH, this.onChannelMessage_);
  this.reset_();
};


/**
 * @override
 */
ydn.crm.su.ui.RecordList.prototype.disposeInternal = function() {
  var hd = this.getHandler();
  hd.unlisten(ydn.msg.getMain(), ydn.crm.ch.BReq.SUGARCRM_CACHE_FETCH, this.onChannelMessage_);
  ydn.crm.su.ui.RecordList.base(this, 'disposeInternal');
};


/**
 * @param {ydn.msg.Event} ev
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.onChannelMessage_ = function(ev) {
  if (ev.type == ydn.crm.ch.BReq.SUGARCRM_CACHE_FETCH) {
    var data = ev.getData();
    if (data['module'] != this.getModel().getModuleName()) {
      return;
    }
    if (data['state'] == 'start') {
      this.dispUpdating_();
    } else {
      this.dispUpdated_(data['count']);
    }
  }
};


/**
 * @param {goog.events.BrowserEvent} ev
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.onFooterClick_ = function(ev) {
  if (ev.target.tagName == 'A' && ev.target.classList.contains('module-option')) {
    ev.preventDefault();
    var m = /** @type {ydn.crm.su.ui.RecordListProvider} */(this.getModel());
    var mn = m.getModuleName();
    ydn.crm.su.ui.UpdateOptionDialog.showModel(mn);
    ydn.crm.shared.logAnalyticValue('ui.cache-update',
        'option.click.module-option', mn, 0);
  }
};


/**
 * @param {goog.events.BrowserEvent} ev
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.onClick_ = function(ev) {
  if (ev.target instanceof Element) {
    if (ev.target.classList.contains('title') ||
        ev.target.classList.contains('summary')) {
      return;
    }
  }

  var li = goog.dom.getAncestorByTagNameAndClass(ev.target, 'LI');
  if (li) {
    var data = {
      'id': li.getAttribute('data-id'),
      'module': li.getAttribute('data-module')
    };
    var se = new ydn.crm.ui.events.ShowPanelEvent(
        ydn.crm.ui.PageName.NEW_RECORD, data, this);
    this.dispatchEvent(se);
  }
};


/**
 * @param {goog.events.BrowserEvent} ev
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.onMouseWheel_ = function(ev) {
  // console.log(ev);
  var we = /** @type {WheelEvent} */(ev.getBrowserEvent());
  var ul = /** @type {Element} */(ev.currentTarget);
  if (we.deltaY > 0) {
    ul.scrollTop += we.deltaY;
    var remaining = ul.scrollHeight - (ul.offsetHeight + ul.scrollTop);
    if (remaining <= 0) {
      this.loadForward_();
    } else {
      ev.stopPropagation();
      ev.preventDefault();
      var rem_items = remaining / ydn.crm.su.ui.RecordList.CSS_ITEM_HEIGHT;
      if (rem_items < 5) {
        this.loadForward_(ul);
      }
    }
  } else if (we.deltaY < 0) {
    ul.scrollTop += we.deltaY;
    var rem_items = ul.scrollTop / ydn.crm.su.ui.RecordList.CSS_ITEM_HEIGHT;
    if (ul.scrollTop > 0) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    if (rem_items <= 5) {
      this.loadBack_(ul);
    }
  }
};


/**
 * Fix item size as specified in CSS
 * .module-record-list > UL > LI
 * @type {number} LI height in pixel.
 */
ydn.crm.su.ui.RecordList.CSS_ITEM_HEIGHT = 34;


/**
 * Prepare list items are available while scrolling.
 * @param {Element=} opt_ul the scroll element.
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.loadForward_ = function(opt_ul) {

  if (this.df_load_forward_) {
    return;
  }
  var offset = 0;
  var ul = opt_ul || this.getUlElement();
  if (ul.lastElementChild) {
    offset = parseInt(ul.lastElementChild.getAttribute('data-offset'), 10);
  }
  if (ydn.crm.su.ui.RecordList.DEBUG) {
    console.log('loadForward from ' + offset);
  }

  this.df_load_forward_ = this.getProvider().list(15, offset);

  this.df_load_forward_.addCallbacks(function(arr) {
    if (arr) {
      for (var i = 0; i < arr.length; i++) {
        arr[i]['ydn$offset'] = 1 + i + offset;
      }
      if (ydn.crm.su.ui.RecordList.DEBUG) {
        console.log(arr.length + ' loaded');
      }
      this.addResults_(arr, true);
    }
    this.df_load_forward_ = null;
  }, function(e) {
    window.console.error(e);
    this.df_load_forward_ = null;
  }, this);
};


/**
 * Prepare list items are available while scrolling.
 * @param {Element=} ul the scroll element.
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.loadBack_ = function(ul) {

};


/**
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.reset_ = function() {
  /**
   * @type {ydn.crm.su.ui.RecordListProvider}
   */
  var model = this.getModel();
  this.getUlElement().innerHTML = '';

  var footer = this.getElement().querySelector(
      '.' + ydn.crm.ui.CSS_CLASS_FOOTER);
  footer.innerHTML = '';
  model.onReady().addCallback(function() {
    this.refresh_();
  }, this);
};


/**
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.refreshFooter_ = function() {
  /**
   * @type {ydn.crm.su.ui.RecordListProvider}
   */
  var model = this.getModel();

  var footer = this.getElement().querySelector(
      '.' + ydn.crm.ui.CSS_CLASS_FOOTER);
  footer.innerHTML = ydn.crm.templ.renderRecordListFooter(model.getModuleName(),
      model.countRecords(), model.getTotal());
};


/**
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.refresh_ = function() {
  this.refreshFooter_();
  this.refreshList_();
};


/**
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.dispUpdating_ = function() {
  var count = this.getElement().querySelector(
      '.' + ydn.crm.ui.CSS_CLASS_FOOTER + ' [name=count]');
  if (count) {
    count.textContent += '..';
  } else {
    var total = this.getElement().querySelector(
        '.' + ydn.crm.ui.CSS_CLASS_FOOTER + ' [name=total]');
    total.textContent += '..';
  }
};


/**
 * @param {number} cnt
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.dispUpdated_ = function(cnt) {
  /**
   * @type {ydn.crm.su.ui.RecordListProvider}
   */
  var model = this.getModel();

  if (cnt) {
    var count = this.getElement().querySelector(
        '.' + ydn.crm.ui.CSS_CLASS_FOOTER + ' [name=count]');
    if (count) {
      count.textContent = model.countRecords() + '+' + cnt;
    } else {
      var total = this.getElement().querySelector(
          '.' + ydn.crm.ui.CSS_CLASS_FOOTER + ' [name=total]');
      total.textContent = model.getTotal() + '+' + cnt;
    }
    model.updateCount().addCallback(function() {
      this.refreshFooter_();
    }, this);
  } else {
    this.refreshFooter_();
  }

};


/**
 * Render item.
 * @param {SugarCrm.Record} rec
 * @return {Element}
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.renderItem_ = function(rec) {
  var li = document.createElement('LI');
  var mn = /** @type {ydn.crm.su.ModuleName} */(rec._module) ||
      this.getModel().getModuleName();
  var symbol = ydn.crm.su.toModuleSymbol(mn);
  li.innerHTML = ydn.crm.templ.renderRecordListItem(mn, symbol);
  li.querySelector('.title').textContent = ydn.crm.su.Record.getLabel(rec);
  li.querySelector('.summary').textContent = ydn.crm.su.Record.getSummary(rec);
  li.setAttribute('data-id', rec.id);
  li.setAttribute('data-module', mn);
  li.setAttribute('data-offset', rec['ydn$offset']);
  return li;
};


/**
 * @param {Element} ul
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.fixHeight_ = function(ul) {
  ul = ul || this.getUlElement();
  if (!ul.style.height) {
    var h = ydn.crm.ui.getPopupContentHeight(2);
    if (h) {
      ul.style.height = h;
    }
  }
};


/**
 * Add result to UL.
 * @param {Array<SugarCrm.Record>} arr results.
 * @param {boolean} forward true.
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.addResults_ = function(arr, forward) {
  if (arr.length == 0) {
    return;
  }
  var ul = this.getUlElement();
  this.fixHeight_(ul);
  if (forward && ul.lastElementChild) {
    var prev_offset = ul.lastElementChild.getAttribute('data-offset');
    var offset = arr[0]['ydn$offset'];
    if (prev_offset != (offset - 1)) {
      ul.innerHTML = '';
    }
  }
  for (var i = 0; i < arr.length; i++) {
    var obj = arr[i];
    var li = this.renderItem_(obj);
    if (forward || ul.childElementCount == 0) {
      ul.appendChild(li);
    } else {
      ul.insertBefore(li, ul.firstElementChild);
    }
  }
};


/**
 * Ensure that full items are renderred in the current position.
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.refreshList_ = function() {
  this.getUlElement().innerHTML = '';
  this.loadForward_();
};


/**
 * @param {ydn.crm.su.model.events.SearchResetEvent} e
 * @private
 */
ydn.crm.su.ui.RecordList.prototype.onReset_ = function(e) {
  this.reset_();
};


/**
 * @return {Element}
 * @protected
 */
ydn.crm.su.ui.RecordList.prototype.getUlElement = function() {
  return this.getContentElement().querySelector('ul');
};


/**
 * @param {ydn.crm.su.ModuleName} mn
 * @param {ydn.crm.su.RecordFilter=} opt_filter set name of filter.
 */
ydn.crm.su.ui.RecordList.prototype.setModule = function(mn, opt_filter) {
  if (opt_filter) {
    this.getProvider().setFilter(opt_filter);
  }
  this.getProvider().setModule(mn);
  this.reset_();
};


/**
 * @return {ydn.crm.su.ui.RecordListProvider}
 */
ydn.crm.su.ui.RecordList.prototype.getProvider = function() {
  return this.getModel();
};


/**
 * @param {ydn.crm.su.RecordOrder} index set name of index for order.
 */
ydn.crm.su.ui.RecordList.prototype.setOrder = function(index) {
  var changed = this.getProvider().setOrder(index);
  if (changed) {
    this.getUlElement().innerHTML = '';
    this.refreshList_();
  }
};


/**
 * @param {ydn.crm.su.RecordFilter} filter set name of filter.
 */
ydn.crm.su.ui.RecordList.prototype.setFilter = function(filter) {
  var changed = this.getProvider().setFilter(filter);
  if (changed) {
    this.getUlElement().innerHTML = '';
    this.refreshList_();
  }
};


/**
 * Set show or hide.
 * @param {boolean} val
 */
ydn.crm.su.ui.RecordList.prototype.setVisible = function(val) {
  goog.style.setElementShown(this.getElement(), val);
};