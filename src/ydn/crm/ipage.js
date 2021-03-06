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
 * @fileoverview Option page app for CRMinInbox suite.
 */



goog.provide('ydn.crm.IPage');



/**
 * @interface
 */
ydn.crm.IPage = function() {};


/**
 * Event for showing the page.
 * @param {string=} opt_query
 */
ydn.crm.IPage.prototype.onPageShow = function(opt_query) {};


/**
 * Render content.
 * @param {Element} el root element.
 */
ydn.crm.IPage.prototype.render = function(el) {};

