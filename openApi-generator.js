const fs = require('fs');
const path = require('path');
const codegen = require('./codegen-utils');
const yaml = require('js-yaml');
class OpenApiGenerator {

     /**
   * @constructor
   */
  constructor () {
    /** @member {Array.<string>} schemas */
    this.schemas = [];
    this.operations = [];
    this.mFilePath=null;
    this.mFileName='/error.txt';
    this.errorContent=[];
  }

     
   /**
     * Return Indent String based on options
     * @param {Object} options
     * @return {string}
     */
    getIndentString (options) {
     try{
        if (options.useTab) {
        return '\t'
        } else {
        var i
        var len
        var indent = []
        for (i = 0, len = options.indentSpaces; i < len; i++) {
            indent.push(' ')
        }
        return indent.join('')
        }
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }


    /**
     * @function getType
     * @description Get attribute type number,boolean,string 
     * @returns string 
     * @param {string} starUMLType 
     */
    getType(starUMLType) {
     try{
        if (starUMLType==="Numeric") {
            return "number";
        } else if (starUMLType==="Indicator") {
            return "boolean";
        } else return "string";
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }

    generate(fullPath,elem,options,fileType){    
          console.log("generate",fullPath);  

          try {
          this.mFilePath=fullPath;
             

         let _this =this;   
         if (elem instanceof type.UMLPackage) {
            
            if (Array.isArray(elem.ownedElements)) {
              elem.ownedElements.forEach(child => {                
                    if(child instanceof type.UMLClass){
                         setTimeout(function() {  
                              try{
                              _this.findClass(child,  options); 
                              }
                              catch(error) {
                                   console.error("Found error",error.message);
                                   _this.writeErrorToFile(error);
                              }
                         },10);
                        //  _this.schemas.push(child);
                    }else if(child instanceof type.UMLInterface){
                        
                        _this.operations.push(child);
                    }
                   
              });
            }

            setTimeout(function() {
               try{
                let resArr = [];
                _this.schemas.forEach(item => {
                    let filter = resArr.filter(subItem =>{
                        return subItem._id==item._id;
                    });
                    if(filter.length==0){
                        resArr.push(item);
                    }
                });
      
                resArr.sort(function(a, b) {                     
                    return a.name.localeCompare(b.name);
                });
              
                let uniqArr = [];
                let duplicateClasses =[];

                let isDuplicate = false;
                resArr.forEach(item=>{
                        let filter = uniqArr.filter(subItem=>{
                            return item.name==subItem.name
                        });
                        if(filter.length==0){
                            uniqArr.push(item);
                        }else{
                            isDuplicate = true;
                            duplicateClasses.push(item.name);
                            let firstElem = uniqArr.indexOf(filter[0]);
                            uniqArr[firstElem].attributes = uniqArr[firstElem].attributes.concat(item.attributes);
                            uniqArr[firstElem].ownedElements = uniqArr[firstElem].ownedElements.concat(item.ownedElements);
                        }
                });

                if(!isDuplicate){
                    _this.writeClass(uniqArr,fullPath, options,elem,fileType);
                     
                }else{
                    app.dialogs.showErrorDialog("There "+ (duplicateClasses.length>1?"are":"is") +" duplicate "+ duplicateClasses.join() + (duplicateClasses.length>1?" classes":" class") + " for same name.");                           
                }
               }
               catch(error) {
                    console.error("Found error",error.message);
                    _this.writeErrorToFile(error);
               }
             
            },500);
           
        } 
     }
     catch(error) {
          console.error("Found error",error.message);
       // expected output: ReferenceError: nonExistentFunction is not defined
       // Note - error messages will vary depending on browser
       this.writeErrorToFile(error);
     }
    }
  

    /**
     * Find Class
     * @param {type.Model} elem
     * @param {Object} options
     */
    findClass(elem, options) {
     try{
        let _this =this;  
        _this.schemas.push(elem);
        if (elem.ownedElements.length>0) {
            elem.ownedElements.forEach(child => {                    
                if(child instanceof type.UMLAssociation){
                    if(child.end1.reference.name!=child.end2.reference.name ){
                        setTimeout(function() {   
                         try{

                             _this.findClass(child.end2.reference,options); 
                         }
                         catch(error) {
                              console.error("Found error",error.message);
                              _this.writeErrorToFile(error);
                         }
                         },5);
                    }                                               
                }else if (child instanceof type.UMLClass) {
                    setTimeout(function () { _this.findClass(child, options); }, 5);
                }
            });                   
        }   
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }      
    }

  
    /**
     * Write Class (Schema)
     * @param {array} classes
     * @param {string} fullPath for generate yml
     * @param {Object} options
     * @param {type.package} mainElem package element
     */
    writeClass(classes,fullPath, options,mainElem,fileType){
     try{

        let classLink = app.repository.select("@UMLAssociationClassLink");
        // let basePath = path.join(fullPath, mainElem.name + '.json');
        
        let arrIdClasses = [];
        let noNameRel = [];
        let flagNoName = false;

        let codeWriter;
        codeWriter = new codegen.CodeWriter(this.getIndentString(options))
        codeWriter.writeLine('components:');
        codeWriter.indent();
        codeWriter.writeLine('schemas:' + (classes.length==0?" {}":""));
        codeWriter.indent();
        classes.forEach(objClass => {

            let accosElems = objClass.ownedElements.filter(item=>{
                return item instanceof type.UMLAssociation;
            });
          
            let assocSideClassLink = classLink.filter(item => {
                return item.associationSide.end2.reference._id==objClass._id;
            });

            codeWriter.writeLine(objClass.name+":" );  
            codeWriter.indent();
            codeWriter.writeLine("type: object"); 
            codeWriter.writeLine("properties:" + ((objClass.attributes.length==0 && accosElems.length==0)?" {}":""));  
            codeWriter.indent();

            let arrAttr = [];

            let i,len;
            for (i = 0, len = objClass.attributes.length && !flagNoName ; i < len; i++) {
                let attr = objClass.attributes[i];
                let filterAttr = arrAttr.filter(item=>{
                    return item.name==attr.name;
                });
                if(filterAttr.length==0 ){
                    arrAttr.push(attr);
                    if(assocSideClassLink.length>0 && attr.isID)
                    {
                        continue;
                    }
                    // if(!attr.isID ){
                        codeWriter.writeLine(attr.name+":");
                        if(attr.multiplicity==="1..*" || attr.multiplicity==="0..*"){
                            codeWriter.indent();
                            codeWriter.writeLine("items:");   
                            codeWriter.indent();
                            codeWriter.writeLine("description: '"+(attr.documentation?this.buildDescription(attr.documentation):"missing description")+"'");
                            codeWriter.writeLine("type: "+  this.getType(attr.type) );
                            codeWriter.outdent();  
                            codeWriter.writeLine("type: array");
                            /**
                             * Add MinItems of multiplicity is 1..*
                             */
                            if( attr.multiplicity==="1..*"){
                                codeWriter.writeLine("minItems: 1");
                            }
                            codeWriter.outdent();  
                        }else{
                            codeWriter.indent();
                            codeWriter.writeLine("description: '"+(attr.documentation?this.buildDescription(attr.documentation):"missing description")+"'");
                            codeWriter.writeLine("type: "+  this.getType(attr.type) );
                            if(attr.type instanceof type.UMLEnumeration){
                                codeWriter.writeLine("enum: [" + this.getEnumerationLiteral(attr.type) +"]");                            
                            }             

                            codeWriter.outdent(); 
                        }
                        if(attr.defaultValue!=""){
                            codeWriter.indent();
                            codeWriter.writeLine("default: '" + attr.defaultValue + "'");
                            codeWriter.outdent();
                        }
                    // }
                    
                }
            }

            let arrAssoc = [];

            let assocClassLink = classLink.filter(item => {
                return item.associationSide.end1.reference._id==objClass._id;
            });

           /**
            * Add asscociation class Properties
            * eg.
            *   TransportMeansParty
                     allOf:
                    - $ref: '#/components/schemas/TransportPartyIds'
                    - $ref: '#/components/schemas/TransportMeansParty'
                    - type: object
            */
            if (assocClassLink.length > 0) {
                assocClassLink.forEach(item => {
                    this.writeAssociationClassProperties(codeWriter, item);
                   
                })
            }


            let arrGeneral = this.findGeneralizationOfClass(objClass); // Git issue #12



           
            let aggregationClasses = [];

            let classAssociations = this.findAssociationOfClass(objClass);

             // Git issue #12
             classAssociations.forEach(assoc => {
                // for (i = 0, len = objClass.ownedElements.length; i < len; i++) {
                //     let assoc = objClass.ownedElements[i];
                if (assoc instanceof type.UMLAssociation) {

                    let filterAssoc = arrAssoc.filter(item=>{
                        return item.name==assoc.name;
                    });
                   
                   

                    if(filterAssoc.length==0 && assoc.name!="" && !flagNoName){



                        if(assoc.end1.aggregation=="shared"){
                            // this.writeAssociationProperties(codeWriter,assoc);
                            aggregationClasses.push(assoc.end2.reference);
                            codeWriter.writeLine(assoc.name+":"); // #7 resolve issue
                            codeWriter.indent();
                            if(assoc.end2.multiplicity==="0..*" || assoc.end2.multiplicity==="1..*"){
                                codeWriter.writeLine("items:");
                                codeWriter.indent();
                                codeWriter.writeLine("allOf:");
                                codeWriter.indent();
                                codeWriter.writeLine("- $ref: '#/components/schemas/"+assoc.end2.reference.name +"Ids'");
                                codeWriter.writeLine("- type: object");
                                codeWriter.outdent();
                                codeWriter.outdent();
                                codeWriter.writeLine("type: array");
                                if( assoc.end2.multiplicity=="1..*"){
                                    codeWriter.writeLine("minItems: 1");
                                }
                                codeWriter.outdent();
                            }else{
                                codeWriter.writeLine("allOf:");
                                codeWriter.indent();
                                codeWriter.writeLine("- $ref: '#/components/schemas/"+assoc.end2.reference.name +"Ids'");
                                codeWriter.writeLine("- type: object");
                                codeWriter.outdent();
                                codeWriter.outdent();
                            }
                        }else{
                            if(assoc.end2.multiplicity==="0..*" || assoc.end2.multiplicity==="1..*"){
                                codeWriter.writeLine(assoc.name+":");
                                codeWriter.indent();
                                codeWriter.writeLine("items: {$ref: '#/components/schemas/"+assoc.end2.reference.name +"'}");   
                                codeWriter.writeLine("type: array");
                                /**
                                 * Add MinItems of multiplicity is 1..*
                                 */
                                if( assoc.end2.multiplicity==="1..*"){
                                    codeWriter.writeLine("minItems: 1");
                                }
                                codeWriter.outdent();
                            }else{
                                codeWriter.writeLine(assoc.name+": {$ref: '#/components/schemas/"+assoc.end2.reference.name +"'}");                            
                            } 
                        }      
                        arrAssoc.push(assoc); 
                    }else {
                        flagNoName = true;
                        let str = assoc.end1.reference.name + "-" + assoc.end2.reference.name;
                        noNameRel.push(str);
                    }                   
                }else if(assoc instanceof type.UMLGeneralization){
                    arrGeneral.push(assoc);
                }
            });

            

            codeWriter.outdent();

            /**
             * Add Generalization class
             * Inherite all properties of parent class
             */
            if(arrGeneral.length>0){
                codeWriter.writeLine("allOf:");
                codeWriter.indent();
                arrGeneral.forEach(generalizeClass => {                   
                    codeWriter.writeLine("- $ref: '#/components/schemas/"+generalizeClass.target.name +"'");
                    codeWriter.writeLine("- type: object");
                });
                codeWriter.outdent();                
            }

            let filterAttributes =arrAttr.filter(item =>{
                return item.isID;
            });


            if(filterAttributes.length>0 && assocSideClassLink.length>0){
                codeWriter.writeLine("allOf:");
                codeWriter.indent();
                codeWriter.writeLine("- $ref: '#/components/schemas/"+objClass.name +"Ids'");
                codeWriter.writeLine("- type: object");
                codeWriter.outdent();       
            }
           
            if(this.getRequiredAttributes(arrAttr).length>0){
                codeWriter.writeLine("required: ["+ this.getRequiredAttributes(arrAttr)+"]" );
            }
            codeWriter.outdent();

             /**
             * Write sceparate schema for isID property of aggregation and relationship class
             **/  
            if(assocSideClassLink.length>0){
                aggregationClasses.push(objClass);
                // this.writeAssociationProperties(codeWriter,objClass);
            }
            aggregationClasses.forEach(itemClass => {
                let filter = arrIdClasses.filter(subItem =>{
                    return itemClass.name==subItem.name;
                });
                if(filter.length==0){
                    this.writeAssociationProperties(codeWriter,itemClass);
                    arrIdClasses.push(itemClass)
                }
            });    
        });    
        
     //    if (noNameRel.length > 0) {
     //        app.dialogs.showErrorDialog("There is no-name relationship between " + noNameRel.join() + " classes.");
     //        return 0;
     //    }

        codeWriter.outdent();
        codeWriter.outdent();

        codeWriter.writeLine("info: {description: "+mainElem.name+" API - 1.0.0, title: "+ mainElem.name+" API, version: '1.0.0'}")
        codeWriter.writeLine("openapi: 3.0.0");
        codeWriter.writeLine("paths:" + (this.operations.length==0?" {}":""));

       
        this.writeOperation(codeWriter,options,mainElem); 
        codeWriter.writeLine("servers: []");
     
      
        this.fileGeneration(codeWriter, fullPath, mainElem, fileType);
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
       
    }  
    

    fileGeneration(codeWriter, fullPath, mainElem, fileType) {
     try{
         console.log("fileGeneration",fullPath);
        let basePath;
        if (fileType == 1) {
            /**
             * Convert yml data to JSON
             */
            basePath = path.join(fullPath, mainElem.name + '.json');

            try {
                var doc = yaml.safeLoad(codeWriter.getData());
                console.log(doc);
                fs.writeFileSync(basePath, JSON.stringify(doc, null, 4));
            } catch (e) {
                console.log(e);
                app.dialogs.showErrorDialog(e.message);
                return 0;
            }
        } else if (fileType == 2) {
            basePath = path.join(fullPath, mainElem.name + '.yml');
            fs.writeFileSync(basePath, codeWriter.getData());
        } else {
            let basePathYML = path.join(fullPath, mainElem.name + '.yml');
            fs.writeFileSync(basePathYML, codeWriter.getData());

            basePath = path.join(fullPath, mainElem.name + '.json');

            try {
                var doc = yaml.safeLoad(codeWriter.getData());
                console.log(doc);
                fs.writeFileSync(basePath, JSON.stringify(doc, null, 4));
            } catch (e) {
                console.log(e);
                app.dialogs.showErrorDialog(e.message);
                return 0;
            }
        }
        app.toast.info("OpenAPI generation completed");
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }

    /**
     * Write Operation (Path)
     * @param {codeWriter} codeWriter
     */
    writeOperation(codeWriter) {
     try{
        let interReal = app.repository.select("@UMLInterfaceRealization");
        this.operations.forEach(objOperation => {
            let filterInterface = interReal.filter(itemInterface => {
                return itemInterface.target.name == objOperation.name;
            });

            if (filterInterface.length > 0) {


                let objInterface = filterInterface[0];

                let interfaceAssociation = app.repository.select(objInterface.target.name + "::@UMLAssociation");
                let filterInterfaceAssociation = interfaceAssociation.filter(item => {
                    return item.end2.aggregation == "composite";
                });

                if (filterInterfaceAssociation.length == 0) {

                    codeWriter.indent();
                    codeWriter.writeLine("/" + objInterface.target.name + ":");
                    codeWriter.indent();
                    objInterface.target.operations.forEach(objOperation => {
                        if (objOperation.name.toUpperCase() == "GET") {
                            codeWriter.writeLine("get:");
                            codeWriter.indent();

                            codeWriter.writeLine("tags:");
                            codeWriter.indent();
                            codeWriter.writeLine("- " + objInterface.target.name);
                            codeWriter.outdent();

                            codeWriter.writeLine("description: Get a list of " + objInterface.source.name);
                           
                            codeWriter.writeLine("parameters: " + (objOperation.parameters.filter(itemParameters => itemParameters.name != "id" && itemParameters.name != "identifier").length > 0
                                        ? ""
                                        : "[]"));

                            this.writeQueryParameters(codeWriter, objOperation);

                            codeWriter.writeLine("responses:");
                            codeWriter.indent();
                            codeWriter.writeLine("'200':");
                            codeWriter.indent();
                            codeWriter.writeLine("content:");
                            codeWriter.indent();
                            codeWriter.writeLine("application/json:");
                            codeWriter.indent();
                            codeWriter.writeLine("schema:");
                            codeWriter.indent();
                            codeWriter.writeLine("items: {$ref: '#/components/schemas/" + objInterface.source.name + "'}");
                            codeWriter.writeLine("type: array");
                            codeWriter.outdent();
                            codeWriter.outdent();
                            codeWriter.outdent();
                            codeWriter.writeLine("description: OK");
                            codeWriter.outdent();
                            codeWriter.outdent();
                            codeWriter.outdent();
                        }
                        else if (objOperation.name.toUpperCase() == "POST") {
                            codeWriter.writeLine("post:");
                            codeWriter.indent();

                            codeWriter.writeLine("tags:");
                            codeWriter.indent();
                            codeWriter.writeLine("- " + objInterface.target.name);
                            codeWriter.outdent();

                            codeWriter.writeLine("description:  Create a new " + objInterface.source.name);

                            this.buildRequestBody(codeWriter, objInterface);

                            codeWriter.writeLine("responses:");
                            codeWriter.indent();
                            codeWriter.writeLine("'201':");
                            codeWriter.indent();
                            codeWriter.writeLine("content:");
                            codeWriter.indent();
                            codeWriter.writeLine("application/json:");
                            codeWriter.indent();
                            codeWriter.writeLine("schema: {$ref: '#/components/schemas/" + objInterface.source.name + "'}");
                            codeWriter.outdent();
                            codeWriter.outdent();
                            codeWriter.writeLine("description: Created");
                            codeWriter.outdent();
                            codeWriter.outdent();

                            codeWriter.outdent();
                        }
                    });

                    codeWriter.outdent();

                    let checkOperationArr = objInterface.target.operations.filter(item => {
                        return item.name == "GET" || item.name == "PUT" || item.name == "DELTE";
                    });

                    if (checkOperationArr.length > 0) {
                        let operationAttributes = objInterface.target.attributes.filter(item => {
                            return item.name == "id" || item.name == "identifier";
                        });
                        operationAttributes.forEach(operationAttribute => {
                            codeWriter.writeLine("/" + objInterface.target.name + "/{" + operationAttribute.name + "}:");
                            codeWriter.indent();

                            objInterface.target.operations.forEach(objOperation => {
                                if (objOperation.name.toUpperCase() == "GET") {
                                    codeWriter.writeLine("get:");
                                    codeWriter.indent();

                                    codeWriter.writeLine("tags:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("- " + objInterface.target.name);
                                    codeWriter.outdent();

                                    codeWriter.writeLine("description: Get single " + objInterface.source.name + " by " + operationAttribute.name);
                                    codeWriter.writeLine("parameters:");
                                    this.buildParameter(codeWriter, operationAttribute.name, "path", (operationAttribute.documentation ? this.buildDescription(operationAttribute.documentation) : "missing description"), true, "{type: string}")

                                    objInterface.target.attributes.forEach(itemAttribute => {
                                        if (itemAttribute.name != "id" && itemAttribute.name != "identifier") {
                                            this.buildParameter(codeWriter, itemAttribute.name, "query", (itemAttribute.documentation ? this.buildDescription(itemAttribute.documentation) : "missing description"), false, "{type: string}")
                                        }
                                    })

                                    codeWriter.writeLine("responses:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("'200':");
                                    codeWriter.indent();
                                    codeWriter.writeLine("content:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("application/json:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("schema: {$ref: '#/components/schemas/" + objInterface.source.name + "'}");

                                    codeWriter.outdent();
                                    codeWriter.outdent();
                                    codeWriter.writeLine("description: OK");
                                    codeWriter.outdent();
                                    codeWriter.outdent();
                                    codeWriter.outdent();

                                }
                                else if (objOperation.name.toUpperCase() == "DELETE") {
                                    codeWriter.writeLine("delete:");
                                    codeWriter.indent();

                                    codeWriter.writeLine("tags:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("- " + objInterface.target.name);
                                    codeWriter.outdent();

                                    codeWriter.writeLine("description: Delete an existing " + objInterface.source.name);
                                    codeWriter.writeLine("parameters:");
                                    this.buildParameter(codeWriter, operationAttribute.name, "path", (operationAttribute.documentation ? this.buildDescription(operationAttribute.documentation) : "missing description"), true, "{type: string}")

                                    objInterface.target.attributes.forEach(itemAttribute => {
                                        if (itemAttribute.name != "id" && itemAttribute.name != "identifier") {
                                            this.buildParameter(codeWriter, itemAttribute.name, "query", (itemAttribute.documentation ? this.buildDescription(itemAttribute.documentation) : "missing description"), false, "{type: string}")
                                        }
                                    });

                                    codeWriter.writeLine("responses:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("'204': {description: No Content}");
                                    codeWriter.outdent();
                                    codeWriter.outdent();

                                }
                                else if (objOperation.name.toUpperCase() == "PUT") {
                                    codeWriter.writeLine("put:");
                                    codeWriter.indent();

                                    codeWriter.writeLine("tags:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("- " + objInterface.target.name);
                                    codeWriter.outdent();

                                    codeWriter.writeLine("description: Update an existing " + objInterface.source.name);
                                    codeWriter.writeLine("parameters:");
                                    this.buildParameter(codeWriter, operationAttribute.name, "path", (operationAttribute.documentation ? this.buildDescription(operationAttribute.documentation) : "missing description"), true, "{type: string}")
                                    objInterface.target.attributes.forEach(itemAttribute => {
                                        if (itemAttribute.name != "id" && itemAttribute.name != "identifier") {
                                            this.buildParameter(codeWriter, itemAttribute.name, "query", (itemAttribute.documentation ? this.buildDescription(itemAttribute.documentation) : "missing description"), false, "{type: string}")
                                        }
                                    });
                                    this.buildRequestBody(codeWriter, objInterface);
                                    codeWriter.writeLine("responses:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("'200':");
                                    codeWriter.indent();
                                    codeWriter.writeLine("content:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("application/json:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("schema: {$ref: '#/components/schemas/" + objInterface.source.name + "'}");
                                    codeWriter.outdent();
                                    codeWriter.outdent();
                                    codeWriter.writeLine("description: OK");

                                    codeWriter.outdent();
                                    codeWriter.outdent();
                                    codeWriter.outdent();
                                } else if (objOperation.name.toUpperCase() == "PATCH") {
                                    codeWriter.writeLine("patch:");
                                    codeWriter.indent();

                                    codeWriter.writeLine("tags:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("- " + objInterface.target.name);
                                    codeWriter.outdent();

                                    codeWriter.writeLine("description:  Update " + objInterface.source.name);
                                    codeWriter.writeLine("parameters:");
                                    this.buildParameter(codeWriter, operationAttribute.name, "path", (operationAttribute.documentation ? this.buildDescription(operationAttribute.documentation) : "missing description"), true, "{type: string}")
                                    objInterface.target.attributes.forEach(itemAttribute => {
                                        if (itemAttribute.name != "id" && itemAttribute.name != "identifier") {
                                            this.buildParameter(codeWriter, itemAttribute.name, "query", (itemAttribute.documentation ? this.buildDescription(itemAttribute.documentation) : "missing description"), false, "{type: string}")
                                        }
                                    });
                                    this.buildRequestBody(codeWriter, objInterface);

                                    codeWriter.writeLine("responses:");
                                    codeWriter.indent();
                                    codeWriter.writeLine("'204': {description: No Content}");
                                    codeWriter.outdent();
                                    codeWriter.outdent();
                                }
                            });
                            codeWriter.outdent();
                        });
                        codeWriter.outdent();
                    }                 
                    
                }else{
                    if (objInterface.target.ownedElements.length > 0) {
                        let interfaceRelation = objInterface.target.ownedElements;
                        interfaceRelation.forEach(interAsso => {
                            if (interAsso instanceof type.UMLAssociation) {
                                if (interAsso.end2.aggregation == "composite") {
                                    this.writeInterfaceComposite(codeWriter, objInterface, interAsso);
                                }
                            }
                        });
                    }
                }
               
            }
        });
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }

    /**
     * Description replace (') with ('')
     * @param {string} desc
     */
    buildDescription(desc){
     try{
        return desc.replace(/\'/g, "''")
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }

    /**
     * @function buildParameter
     * @param {codeWriter} codeWriter
     * @param {string} name
     * @param {string} type
     * @param {string} description
     * @param {boolean} required
     * @param {string} schema 
     */
    buildParameter(codeWriter, name,  type,  description,  required,  schema) {
     try{
        // codeWriter.writeLine("parameters:");
        codeWriter.writeLine("- description: " + description);
        codeWriter.indent();
        codeWriter.writeLine("in: " + type);
        codeWriter.writeLine("name: "+name);
        codeWriter.writeLine("required: " + required);
        codeWriter.writeLine("schema: " + schema);
        codeWriter.outdent();
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }

    /**
     * @function buildRequestBody
     * @param {codewrite} codeWriter 
     * @param {interface} objInterface 
     */
     buildRequestBody(codeWriter, objInterface) {
          try{
        codeWriter.writeLine('requestBody:');
        codeWriter.indent();
        codeWriter.writeLine("content:");
        codeWriter.indent();
        codeWriter.writeLine("application/json:");
        codeWriter.indent();
        codeWriter.writeLine("schema: {$ref: '#/components/schemas/"+objInterface.source.name+"'}"); 
        codeWriter.outdent();
        codeWriter.outdent();
        codeWriter.writeLine("description: ''");
        codeWriter.writeLine("required: true");
        codeWriter.outdent();      
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }

    /**
     * @function getEnumerationLiteral
     * @param {UMLEnumaration} objEnum 
     */
    getEnumerationLiteral(objEnum){
     try{
        let result = objEnum.literals.map(a => a.name);
        return (result);
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }

    /**
     * @function getRequiredAttributes
     * @param {UMLAttributes[]} arrAttributes 
     */
    getRequiredAttributes(arrAttributes){
     try{

        let requiredAttr = [];
         arrAttributes.forEach(item => {
            if(item.multiplicity=="1" || item.multiplicity=="1..*"){
                requiredAttr.push(item.name);
            }
            
        });
        return (requiredAttr);
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }

    /**
     * @function writeAssociationProperties
     * @param {codeWriter} codeWriter 
     * @param {UMLAssociation} assciation 
     */
    writeAssociationProperties(codeWriter, assciation){
     try{
       
        let tempClass;
        if(assciation instanceof type.UMLAssociation){
            tempClass = assciation.end2.reference;
          
        }else{
            tempClass = assciation;           
        }

        let generalizeClasses = this.findGeneralizationOfClass(tempClass);

        let filterAttributes = tempClass.attributes.filter(item => {
            return item.isID;
        });

        generalizeClasses.forEach(genClass => {
            let genClassAttr = genClass.target.attributes.filter(item => {
                return item.isID;
            });
            filterAttributes = filterAttributes.concat(genClassAttr);
        });

        if(filterAttributes.length>0){

            codeWriter.writeLine( (assciation instanceof type.UMLAssociation)?(assciation.name+":"):(tempClass.name+"Ids:") );
            codeWriter.indent();
            codeWriter.writeLine("type: object");
            codeWriter.writeLine("properties:");
            codeWriter.indent();
               
            filterAttributes.forEach(attr => {
                    
                    codeWriter.writeLine(attr.name+":");
                    if(attr.multiplicity==="1..*" || attr.multiplicity==="0..*"){
                        codeWriter.indent();
                        codeWriter.writeLine("items:");   
                        codeWriter.indent();
                        codeWriter.writeLine("description: '"+(attr.documentation?this.buildDescription(attr.documentation):"missing description")+"'");
                        codeWriter.writeLine("type: "+  this.getType(attr.type) );
                        codeWriter.outdent();  
                        codeWriter.writeLine("type: array");
                        /**
                         * Add MinItems of multiplicity is 1..*
                         */
                        if( attr.multiplicity==="1..*"){
                            codeWriter.writeLine("minItems: 1");
                        }
                        codeWriter.outdent();  
                    }else{
                        codeWriter.indent();
                        codeWriter.writeLine("description: '"+(attr.documentation?this.buildDescription(attr.documentation):"missing description")+"'");
                        codeWriter.writeLine("type: "+  this.getType(attr.type) );
                        if(attr.type instanceof type.UMLEnumeration){
                            codeWriter.writeLine("enum: [" + this.getEnumerationLiteral(attr.type) +"]");                            
                        }             
                        codeWriter.outdent(); 
                    }                   
            });

            codeWriter.outdent();
           
            if(this.getRequiredAttributes(filterAttributes).length>0)
                codeWriter.writeLine("required: ["+ this.getRequiredAttributes(filterAttributes)+"]");
            
            codeWriter.outdent();
        }
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }


    /**
     * @function writeAssociationClassProperties
     * @param {codeWriter} codeWriter 
     * @param {UMLAssociationClass} associationClass 
     */
    writeAssociationClassProperties(codeWriter, associationClass){
     try{
        var end2Attributes = associationClass.associationSide.end2.reference.attributes;
        var classSideAtributes = associationClass.classSide.attributes;
        codeWriter.writeLine(associationClass.classSide.name+":");
        codeWriter.indent();
       
        if(associationClass.associationSide.end2.multiplicity=="0..*" || associationClass.associationSide.end2.multiplicity=="1..*"){
       
            codeWriter.writeLine("items:");   
            codeWriter.indent();
            codeWriter.writeLine("allOf:");
            codeWriter.indent();
            codeWriter.writeLine("- $ref: '#/components/schemas/"+associationClass.associationSide.end2.reference.name +"Ids'");
            codeWriter.writeLine("- $ref: '#/components/schemas/"+associationClass.classSide.name +"'");
            codeWriter.writeLine("- type: object");
            codeWriter.outdent();   
            codeWriter.outdent();
            codeWriter.writeLine("type: array"); 
            if( associationClass.associationSide.end2.multiplicity=="1..*"){
                codeWriter.writeLine("minItems: 1");
            }  
            codeWriter.outdent();
        }else{
            codeWriter.writeLine("allOf:");
            codeWriter.indent();
            codeWriter.writeLine("- $ref: '#/components/schemas/"+associationClass.associationSide.end2.reference.name +"Ids'");
            codeWriter.writeLine("- $ref: '#/components/schemas/"+associationClass.classSide.name +"'");
            codeWriter.writeLine("- type: object");
            codeWriter.outdent();   
            codeWriter.outdent();
        }

       
        // classSideAtributes.forEach(attr => {
        //         codeWriter.writeLine(attr.name+":");
        //         codeWriter.indent();
        //         codeWriter.writeLine("description: '"+(attr.documentation?this.buildDescription(attr.documentation):"missing description")+"'");
        //         codeWriter.writeLine("type: "+  this.getType(attr.type) );
        //         if(attr.type instanceof type.UMLEnumeration){
        //             codeWriter.writeLine("enum: [" + this.getEnumerationLiteral(attr.type) +"]");                            
        //         }   
        //         codeWriter.outdent();
          
        // });

        // end2Attributes.forEach(attr => {
        //     if(attr.isID){
        //         codeWriter.writeLine(attr.name+":");
        //         codeWriter.indent();
        //         codeWriter.writeLine("description: '"+(attr.documentation?this.buildDescription(attr.documentation):"missing description")+"'");
        //         codeWriter.writeLine("type: "+  this.getType(attr.type) );
        //         if(attr.type instanceof type.UMLEnumeration){
        //             codeWriter.writeLine("enum: [" + this.getEnumerationLiteral(attr.type) +"]");                            
        //         }   
        //         codeWriter.outdent();
        //     }
        // });
        // codeWriter.outdent();
        // codeWriter.outdent();

     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }

    /**
     * @function writeInterfaceComposite
     * @param {codeWriter} codeWriter 
     * @param {UMLInterfaceRealization} interfaceRealization 
     * @param {UMLAssociation} interfaceAssociation 
     */
    writeInterfaceComposite(codeWriter,interfaceRealization, interfaceAssociation){
     try{
        let end1Interface = interfaceAssociation.end1;
        let end2Interface = interfaceAssociation.end2;
        codeWriter.indent();
       interfaceRealization.target.operations.forEach(objOperation =>{
            if(objOperation.name.toUpperCase()=="GET"){                
                
                /* Get all list */
                codeWriter.writeLine("/"+end2Interface.reference.name+"/{"+end2Interface.reference.name +"_"+end2Interface.reference.attributes[0].name+"}/"+end1Interface.reference.name+":");
                codeWriter.indent();
                codeWriter.writeLine("get:");
                codeWriter.indent();

                codeWriter.writeLine("tags:");
                codeWriter.indent();
                codeWriter.writeLine("- " + interfaceRealization.target.name);
                codeWriter.outdent();

                codeWriter.writeLine("description: Get a list of " +interfaceRealization.source.name);
                codeWriter.writeLine("parameters:");
                this.buildParameter(codeWriter,end2Interface.reference.name +"_"+ end2Interface.reference.attributes[0].name,"path",(end2Interface.reference.attributes[0].documentation?this.buildDescription(end2Interface.reference.attributes[0].documentation):"missing description"),true,"{type: string}")
                              
                codeWriter.writeLine("responses:");
                codeWriter.indent();
                codeWriter.writeLine("'200':");
                codeWriter.indent();
                codeWriter.writeLine("content:");
                codeWriter.indent();
                codeWriter.writeLine("application/json:");
                codeWriter.indent();
                codeWriter.writeLine("schema:"); 
                codeWriter.indent();
                codeWriter.writeLine("items: {$ref: '#/components/schemas/"+interfaceRealization.source.name+"'}");
                codeWriter.writeLine("type: array");   
                codeWriter.outdent();
                codeWriter.outdent();
                codeWriter.outdent();
                codeWriter.writeLine("description: OK");
                codeWriter.outdent();
                codeWriter.outdent();
                codeWriter.outdent();    
                codeWriter.outdent();   

                /* Get single element record */
                codeWriter.writeLine("/"+end2Interface.reference.name+"/{"+end2Interface.reference.name +"_"+end2Interface.reference.attributes[0].name+"}/"+end1Interface.reference.name+"/{"+end1Interface.reference.name +"_"+end1Interface.reference.attributes[0].name+"}:");
                codeWriter.indent();
                codeWriter.writeLine("get:");
                codeWriter.indent();

                codeWriter.writeLine("tags:");
                codeWriter.indent();
                codeWriter.writeLine("- " + interfaceRealization.target.name);
                codeWriter.outdent();

                codeWriter.writeLine("description: Get a list of " +interfaceRealization.source.name);
                codeWriter.writeLine("parameters:");
                this.buildParameter(codeWriter,end2Interface.reference.name +"_"+ end2Interface.reference.attributes[0].name,"path",(end2Interface.reference.attributes[0].documentation?this.buildDescription(end2Interface.reference.attributes[0].documentation):"missing description"),true,"{type: string}")
                this.buildParameter(codeWriter,end1Interface.reference.name +"_"+end1Interface.reference.attributes[0].name,"path",(end1Interface.reference.attributes[0].documentation?this.buildDescription(end1Interface.reference.attributes[0].documentation):"missing description"),true,"{type: string}")
                              
                codeWriter.writeLine("responses:");
                codeWriter.indent();
                codeWriter.writeLine("'200':");
                codeWriter.indent();
                codeWriter.writeLine("content:");
                codeWriter.indent();
                codeWriter.writeLine("application/json:");
                codeWriter.indent();
                codeWriter.writeLine("schema: {$ref: '#/components/schemas/"+interfaceRealization.source.name+"'}");
               
                codeWriter.outdent();
                codeWriter.outdent();
                codeWriter.writeLine("description: OK");
                codeWriter.outdent();
                codeWriter.outdent();
                codeWriter.outdent();    
                codeWriter.outdent(); 
            }
            else if(objOperation.name.toUpperCase()=="POST"){
                codeWriter.writeLine("/"+end2Interface.reference.name+"/{"+end2Interface.reference.attributes[0].name+"}/"+end1Interface.reference.name+":");
                codeWriter.indent();
                codeWriter.writeLine("post:");
                codeWriter.indent();

                codeWriter.writeLine("tags:");
                codeWriter.indent();
                codeWriter.writeLine("- " + interfaceRealization.target.name);
                codeWriter.outdent();

                codeWriter.writeLine("description:  Create a new " +interfaceRealization.source.name);
                codeWriter.writeLine("parameters:");
                this.buildParameter(codeWriter,end2Interface.reference.attributes[0].name,"path",(end2Interface.reference.attributes[0].documentation?this.buildDescription(end2Interface.reference.attributes[0].documentation):"missing description"),true,"{type: string}")
               
                this.buildRequestBody(codeWriter, interfaceRealization);
            
                codeWriter.writeLine("responses:");
                codeWriter.indent();
                codeWriter.writeLine("'201':");
                codeWriter.indent();
                codeWriter.writeLine("content:");
                codeWriter.indent();
                codeWriter.writeLine("application/json:");
                codeWriter.indent();
                codeWriter.writeLine("schema: {$ref: '#/components/schemas/"+interfaceRealization.source.name+"'}"); 
                codeWriter.outdent();
                codeWriter.outdent();
                codeWriter.writeLine("description: Created");
                codeWriter.outdent();
                codeWriter.outdent();

                codeWriter.outdent();  
                codeWriter.outdent();                        
            }else if(objOperation.name.toUpperCase()=="DELETE"){
                codeWriter.writeLine("/"+end2Interface.reference.name+"/{"+end2Interface.reference.name +"_"+end2Interface.reference.attributes[0].name+"}/"+end1Interface.reference.name+"/{"+end1Interface.reference.name +"_"+end1Interface.reference.attributes[0].name+"}:");
                codeWriter.indent();
                codeWriter.writeLine("delete:");
                codeWriter.indent();

                codeWriter.writeLine("tags:");
                codeWriter.indent();
                codeWriter.writeLine("- " + objInterface.target.name);
                codeWriter.outdent();

                codeWriter.writeLine("description: Delete an existing " +objInterface.source.name);
                codeWriter.writeLine("parameters:");
                this.buildParameter(codeWriter,end2Interface.reference.name +"_"+ end2Interface.reference.attributes[0].name,"path",(end2Interface.reference.attributes[0].documentation?this.buildDescription(end2Interface.reference.attributes[0].documentation):"missing description"),true,"{type: string}")
                this.buildParameter(codeWriter,end1Interface.reference.name +"_"+end1Interface.reference.attributes[0].name,"path",(end1Interface.reference.attributes[0].documentation?this.buildDescription(end1Interface.reference.attributes[0].documentation):"missing description"),true,"{type: string}")
               
                codeWriter.writeLine("responses:");
                codeWriter.indent();
                codeWriter.writeLine("'204': {description: No Content}");
                codeWriter.outdent();
                codeWriter.outdent();   
                codeWriter.outdent();                              
            
            }
        });  
        codeWriter.outdent();  
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }       
    }

    /**
     * @function findAssociationOfClass
     * @description Find all association of UMLClass
     * @param {UMLClass} objClass 
     */
    findAssociationOfClass(objClass) {
     try{
        let associations = app.repository.select("@UMLAssociation");
        let filterAssociation = associations.filter(item => {
            return item.end1.reference._id == objClass._id
        });
        console.log(objClass.name, filterAssociation);
        return filterAssociation;
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }

    }

    /**
     * @function findGeneralizationOfClass
     * @description Find all generalization of UMLClass
     * @param {UMLClass} objClass 
     */

    findGeneralizationOfClass(objClass) {
     try{
          let generalizeClasses = app.repository.select("@UMLGeneralization");
          let filterGeneral = generalizeClasses.filter(item => {
               return item.source._id == objClass._id
          });
          return filterGeneral;
         }
         catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
         }
    }
//Test error writing 
    writeQueryParameters(codeWriter, objOperation) {
     try{
        objOperation.parameters.forEach(itemParameters => {
            if (itemParameters.name != "id" && itemParameters.name != "identifier") {
                if (!(itemParameters.type instanceof type.UMLClass)) {
                    this.buildParameter(codeWriter, itemParameters.name, "query", (itemParameters.documentation
                        ? this.buildDescription(itemParameters.documentation)
                        : "missing description"), false, "{type: string}");
                } else {
                   
                        this.buildParameter(codeWriter, itemParameters.type.name+"."+itemParameters.name, "query", (itemParameters.documentation
                            ? this.buildDescription(itemParameters.documentation)
                            : "missing description"), false, "{type: string}");
                    

                }
            }
        });
     }
     catch(error) {
          console.error("Found error",error.message);
          this.writeErrorToFile(error);
     }
    }
    writeErrorToFile(error){
     this.errorContent.push(error.message);
     fs.writeFile(this.mFilePath+this.mFileName, JSON.stringify(this.errorContent), function(err) {
          if (err) {
               console.error("Error writing file",err);
          }
     });
    }
      
}

exports.OpenApiGenerator = OpenApiGenerator;
