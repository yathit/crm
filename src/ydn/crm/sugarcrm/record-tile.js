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
 * @fileoverview SugarCRM Record tile inside SugarCRM home page.
 *
 * A tile dispatch click event to Desktop.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.crm.su.ui.RecordTile');
goog.require('goog.ui.Component');
goog.require('ydn.crm.su');
goog.require('ydn.crm.templ');
goog.require('ydn.crm.ui.events');



/**
 * SugarCRM Record tile.
 * @param {!ydn.crm.su.model.Sugar} sugar
 * @param {ydn.crm.su.ModuleName} name module name.
 * @param {goog.dom.DomHelper=} opt_dom
 * @constructor
 * @struct
 * @extends {goog.ui.Component}
 */
ydn.crm.su.ui.RecordTile = function(sugar, name, opt_dom) {
  goog.base(this, opt_dom);
  /**
   * @type {ydn.crm.su.ModuleName}
   * @protected
   */
  this.name = name;
  this.setModel(sugar);
};
goog.inherits(ydn.crm.su.ui.RecordTile, goog.ui.Component);


/**
 * @return {ydn.crm.su.model.Sugar}
 * @override
 */
ydn.crm.su.ui.RecordTile.prototype.getModel;


/**
 * @inheritDoc
 */
ydn.crm.su.ui.RecordTile.prototype.createDom = function() {
  goog.base(this, 'createDom');
  var root = this.getElement();
  var dom = this.getDomHelper();
  root.classList.add('tile-container');
  root.classList.add(this.name);
  var symbol = ydn.crm.su.toModuleSymbol(this.name);
  root.innerHTML = ydn.crm.templ.renderSugarCrmRecordTile(symbol, this.name);
};


/**
 * @inheritDoc
 */
ydn.crm.su.ui.RecordTile.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  var tile = this.getElement().querySelector('.record-tile');
  this.getHandler().listen(tile, 'click', this.onTileClick_);
};


/**
 * @param {goog.events.BrowserEvent} ev
 * @private
 */
ydn.crm.su.ui.RecordTile.prototype.onTileClick_ = function(ev) {
  var data = {
    'module': this.name
  };
  ev.stopPropagation();
  var se = new ydn.crm.ui.events.ShowPanelEvent(
      ydn.crm.ui.PageName.RECORD_LIST, data, this);
  this.dispatchEvent(se);
};