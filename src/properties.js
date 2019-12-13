const Utils = require('./utils');
var forEach = require('async-foreach').forEach;
const openAPI = require('../src/openapi');
/**
 * @description class returns the Attributes available in class  
 * @class Properties
 */
class Properties {

     /**
      * @constructor Creates an instance of Properties.
      */
     constructor(objClass, assocSideClassLink) {
          this.objClass = objClass;
          this.assocSideClassLink = assocSideClassLink;
          this.arrAttRequired = [];
          this.utils = new Utils();
     }

     /**
      * @function getAttributes
      * @description Returns the array of properties
      * @returns {Array}
      * @memberof Properties
      */
     getAttributes() {
          return this.arrAttRequired;
     }

     /**
      * @function addProperties
      * @description Adds properties to mainPropertiesObject
      * @memberof Properties
      */
     addProperties() {
          let mainPropertiesObj = {};
          let _this = this;
          _this.arrAttRequired = [];
          let propertiesObj = {};
          let attributes = this.objClass.attributes;
          forEach(attributes, function (attribute) {

               propertiesObj = {};
               let filterAttr = _this.arrAttRequired.filter(item => {
                    return item.name == attribute.name;
               });

               /* Filter for visible attribute Views from diagram elements (Class & Interface) */
               if(Utils.addAttributeData(attribute)){
                    _this.addPropData(filterAttr, mainPropertiesObj, propertiesObj, attribute);
               }
               
          });
          return mainPropertiesObj;
     }
     addPropData(filterAttr, mainPropertiesObj, propertiesObj, attribute) {
          let _this = this;
          if (filterAttr.length == 0) {
               _this.arrAttRequired.push(attribute);

               if (_this.assocSideClassLink.length > 0 && attribute.isID) {
                    console.log("Skipped classlink : " + _this.objClass.name + " : " + attribute.name);
               } else {

                    /* if(!attribute.isID ){ */
                    mainPropertiesObj[attribute.name] = propertiesObj;
                    /* Add Multiplicity */
                    if (attribute.multiplicity === "1..*" || attribute.multiplicity === "0..*") {
                         let itemsObj = {};
                         propertiesObj.items = itemsObj;
                         itemsObj.description = (attribute.documentation ? _this.utils.buildDescription(attribute.documentation) : "missing description");

                         _this.utils.addAttributeType(itemsObj, attribute);

                         propertiesObj.type = 'array';
                         /**
                          * Add MinItems of multiplicity is 1..*
                          */
                         if (attribute.multiplicity === "1..*") {
                              propertiesObj.minItems = 1;
                         }
                    } else {
                         propertiesObj.description = (attribute.documentation ? _this.utils.buildDescription(attribute.documentation) : "missing description");

                         _this.utils.addAttributeType(propertiesObj, attribute);

                         if (attribute.type instanceof type.UMLEnumeration) {
                              /* Add Enumeration */
                              propertiesObj.enum = _this.utils.getEnumerationLiteral(attribute.type);
                         }
                    }
                    if (attribute.defaultValue != "") {
                         /* Add default field */
                         propertiesObj.example = attribute.defaultValue;
                    }
                    /* } */

               }
          }
     }

}

module.exports = Properties;