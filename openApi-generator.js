const fs = require('fs');
const path = require('path');
const codegen = require('./codegen-utils');

class OpenApiGenerator {

     /**
   * @constructor
   */
  constructor () {
    /** @member {Array.<string>} schemas */
    this.schemas = [];
    this.operations = [];
  }

   /**
     * Return Indent String based on options
     * @param {Object} options
     * @return {string}
     */
    getIndentString (options) {
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


    /**
     * @function getType
     * @description Get attribute type number,boolean,string 
     * @returns string 
     * @param {string} starUMLType 
     */
    getType(starUMLType) {
        if (starUMLType==="Numeric") {
            return "number";
        } else if (starUMLType==="Indicator") {
            return "boolean";
        } else return "string";
    }

    generate(fullPath,elem,options){      
                
         let _this =this;   
         if (elem instanceof type.UMLPackage) {
            
            if (Array.isArray(elem.ownedElements)) {
              elem.ownedElements.forEach(child => {                
                    if(child instanceof type.UMLClass){
                         setTimeout(function() {  _this.findClass(child,  options); },10);
                        //  _this.schemas.push(child);
                    }else if(child instanceof type.UMLInterface){
                        
                        _this.operations.push(child);
                    }
                   
              });
            }

            setTimeout(function() {
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
                     _this.writeClass(uniqArr,fullPath, options,elem);
                     
                }else{
                    app.dialogs.showErrorDialog("There "+ (duplicateClasses.length>1?"are":"is") +" duplicate "+ duplicateClasses.join() + (duplicateClasses.length>1?" classes":" class") + " for same name.");                           
                }
             
            },500);
           
        } 
    }
  

    /**
     * Find Class
     * @param {type.Model} elem
     * @param {Object} options
     */
    findClass(elem, options) {
        let _this =this;  
        _this.schemas.push(elem);
        if (elem.ownedElements.length>0) {
            elem.ownedElements.forEach(child => {                    
                if(child instanceof type.UMLAssociation){
                    if(child.end1.reference.name!=child.end2.reference.name){
                        setTimeout(function() {   _this.findClass(child.end2.reference,options); },5);
                    }                                               
                }
            });                   
        }            
    }

  
    /**
     * Write Class (Schema)
     * @param {array} classes
     * @param {string} fullPath for generate yml
     * @param {Object} options
     * @param {type.package} mainElem package element
     */
    writeClass(classes,fullPath, options,mainElem){

        let classLink = app.repository.select("@UMLAssociationClassLink")
      
        let basePath = path.join(fullPath, mainElem.name + '.yml')
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

            codeWriter.writeLine(objClass.name+":" );  
            codeWriter.indent();
            codeWriter.writeLine("properties:" + ((objClass.attributes.length==0 && accosElems.length==0)?" {}":""));  
            codeWriter.indent();

            let arrAttr = [];

            let i,len;
            for (i = 0, len = objClass.attributes.length; i < len; i++) {
                let attr = objClass.attributes[i];
                let filterAttr = arrAttr.filter(item=>{
                    return item.name==attr.name;
                });
                if(filterAttr.length==0){
                    codeWriter.writeLine(attr.name+":");
                    if(attr.multiplicity==="1..*" || attr.multiplicity==="0..*"){
                        codeWriter.indent();
                        codeWriter.writeLine("items: {description: '"+ (attr.documentation?this.buildDescription(attr.documentation):"missing description")+"', type: "+ this.getType(attr.type)+" }");   
                        codeWriter.writeLine("type: array");
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
                    arrAttr.push(attr);
                }
            }


            let arrGeneral = [];

            let arrAssoc = [];
            for (i = 0, len = objClass.ownedElements.length; i < len; i++) {
                let assoc = objClass.ownedElements[i];
                if (assoc instanceof type.UMLAssociation) {
                    let filterAssoc = arrAssoc.filter(item=>{
                        return item.name==assoc.name;
                    });
                    if(filterAssoc.length==0 && assoc.name!=""){

                        if(assoc.end1.aggregation=="shared"){
                            this.writeAssociationProperties(codeWriter,assoc);
                        }else{
                            if(assoc.end2.multiplicity==="0..*" || assoc.end2.multiplicity==="1..*"){
                                codeWriter.writeLine(assoc.name+":");
                                codeWriter.indent();
                                codeWriter.writeLine("items: {$ref: '#/components/schemas/"+assoc.end2.reference.name +"'}");   
                                codeWriter.writeLine("type: array");
                                codeWriter.outdent();
                            }else{
                                codeWriter.writeLine(assoc.name+": {$ref: '#/components/schemas/"+assoc.end2.reference.name +"'}");                            
                            } 
                        }      
                        arrAssoc.push(assoc); 
                    }                    
                }else if(assoc instanceof type.UMLGeneralization){
                    arrGeneral.push(assoc);
                }
            }

            let assocClassLink = classLink.filter(item => {
                return item.associationSide.end1.reference._id==objClass._id;
            });

           
            if(assocClassLink.length>0)
            {
                this.writeAssociationClassProperties(codeWriter,assocClassLink[0]);
            }

            codeWriter.outdent();

            if(arrGeneral.length>0){
                codeWriter.writeLine("allOf:");
                codeWriter.indent();
                arrGeneral.forEach(generalizeClass => {
                   
                    codeWriter.writeLine("- $ref: '#/components/schemas/"+generalizeClass.target.name +"'");
                    codeWriter.writeLine("- type: object");
                });
                codeWriter.outdent();                
            }
           
            if(this.getRequiredAttributes(arrAttr).length>0){
                codeWriter.writeLine("required: ["+ this.getRequiredAttributes(arrAttr)+"]" );
            }
            codeWriter.outdent();
        });    
        

        codeWriter.outdent();
        codeWriter.outdent();

        codeWriter.writeLine("info: {description: "+mainElem.name+" API - 1.0.0, title: "+ mainElem.name+" API, version: '1.0.0'}")
        codeWriter.writeLine("openapi: 3.0.0");
        codeWriter.writeLine("paths:" + (this.operations.length==0?" {}":""));

       
        this.writeOperation(codeWriter,options,mainElem); 
        codeWriter.writeLine("servers: []");
      
        fs.writeFileSync(basePath, codeWriter.getData());  
    }  

    /**
     * Write Operation (Path)
     * @param {codeWriter} codeWriter
     */
    writeOperation(codeWriter){
        let interReal = app.repository.select("@UMLInterfaceRealization");
        this.operations.forEach(objOperation => {
                let filterInterface = interReal.filter(itemInterface =>{
                    return itemInterface.target.name == objOperation.name;
                });
                if(filterInterface.length>0){
                    let objInterface = filterInterface[0];
       
                    codeWriter.indent();
                    codeWriter.writeLine("/"+objInterface.target.name+":");
                    codeWriter.indent();
                    objInterface.target.operations.forEach(objOperation =>{
                        if(objOperation.name.toUpperCase()=="GET"){
                            codeWriter.writeLine("get:");
                            codeWriter.indent();

                            codeWriter.writeLine("tags:");
                            codeWriter.indent();
                            codeWriter.writeLine("- " + objInterface.target.name);
                            codeWriter.outdent();
        
                            codeWriter.writeLine("description: Get a list of " +objInterface.source.name);
                            codeWriter.writeLine("parameters: []");
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
                            codeWriter.writeLine("items: {$ref: '#/components/schemas/"+objInterface.source.name+"'}");
                            codeWriter.writeLine("type: array");   
                            codeWriter.outdent();
                            codeWriter.outdent();
                            codeWriter.outdent();
                            codeWriter.writeLine("description: OK");
                            codeWriter.outdent();
                            codeWriter.outdent();
                            codeWriter.outdent();                        
                        }
                        else if(objOperation.name.toUpperCase()=="POST"){
                            codeWriter.writeLine("post:");
                            codeWriter.indent();

                            codeWriter.writeLine("tags:");
                            codeWriter.indent();
                            codeWriter.writeLine("- " + objInterface.target.name);
                            codeWriter.outdent();

                            codeWriter.writeLine("description:  Create a new " +objInterface.source.name);

                            this.buildRequestBody(codeWriter, objInterface);
                        
                            codeWriter.writeLine("responses:");
                            codeWriter.indent();
                            codeWriter.writeLine("'201':");
                            codeWriter.indent();
                            codeWriter.writeLine("content:");
                            codeWriter.indent();
                            codeWriter.writeLine("application/json:");
                            codeWriter.indent();
                            codeWriter.writeLine("schema: {$ref: '#/components/schemas/"+objInterface.source.name+"'}"); 
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
                        return item.name=="GET" || item.name=="PUT" || item.name=="DELTE";
                    });

                    if(checkOperationArr.length>0){
                        objInterface.target.attributes.forEach( operationAttribute => {
                        codeWriter.writeLine("/"+objInterface.target.name+"/{"+operationAttribute.name+"}:");
                        codeWriter.indent();
                            
                        objInterface.target.operations.forEach(objOperation => {
                            if(objOperation.name.toUpperCase()=="GET"){
                                codeWriter.writeLine("get:");
                                codeWriter.indent();

                                codeWriter.writeLine("tags:");
                                codeWriter.indent();
                                codeWriter.writeLine("- " + objInterface.target.name);
                                codeWriter.outdent();

                                codeWriter.writeLine("description: Get single " +objInterface.source.name+" by " + operationAttribute.name);
                                codeWriter.writeLine("parameters:");
                                this.buildParameter(codeWriter,operationAttribute.name,"path",(operationAttribute.documentation?this.buildDescription(operationAttribute.documentation):"missing description"),true,"{type: string}")

                                codeWriter.writeLine("responses:");
                                codeWriter.indent();
                                codeWriter.writeLine("'200':");
                                codeWriter.indent();
                                codeWriter.writeLine("content:");
                                codeWriter.indent();
                                codeWriter.writeLine("application/json:");
                                codeWriter.indent();
                                codeWriter.writeLine("schema: {$ref: '#/components/schemas/"+ objInterface.source.name +"'}"); 
                            
                                codeWriter.outdent();
                                codeWriter.outdent();
                                codeWriter.writeLine("description: OK");
                                codeWriter.outdent();
                                codeWriter.outdent();
                                codeWriter.outdent();
                            
                            }
                            else  if(objOperation.name.toUpperCase()=="DELETE"){
                                codeWriter.writeLine("delete:");
                                codeWriter.indent();

                                codeWriter.writeLine("tags:");
                                codeWriter.indent();
                                codeWriter.writeLine("- " + objInterface.target.name);
                                codeWriter.outdent();

                                codeWriter.writeLine("description: Delete an existing " +objInterface.source.name);
                                codeWriter.writeLine("parameters:");
                                this.buildParameter(codeWriter,operationAttribute.name,"path",(operationAttribute.documentation?this.buildDescription(operationAttribute.documentation):"missing description"),true,"{type: string}")
                            
                                codeWriter.writeLine("responses:");
                                codeWriter.indent();
                                codeWriter.writeLine("'204': {description: No Content}");
                                codeWriter.outdent();
                                codeWriter.outdent();                               
                            
                            }
                            else  if(objOperation.name.toUpperCase()=="PUT"){
                                codeWriter.writeLine("put:");
                                codeWriter.indent();

                                codeWriter.writeLine("tags:");
                                codeWriter.indent();
                                codeWriter.writeLine("- " + objInterface.target.name);
                                codeWriter.outdent();

                                codeWriter.writeLine("description: Update an existing " +objInterface.source.name);
                                codeWriter.writeLine("parameters:");
                                this.buildParameter(codeWriter,operationAttribute.name,"path",(operationAttribute.documentation?this.buildDescription(operationAttribute.documentation):"missing description"),true,"{type: string}")
                                this.buildRequestBody(codeWriter, objInterface);
                                codeWriter.writeLine("responses:");
                                codeWriter.indent();
                                codeWriter.writeLine("'200':");
                                codeWriter.indent();
                                codeWriter.writeLine("content:");
                                codeWriter.indent();
                                codeWriter.writeLine("application/json:");
                                codeWriter.indent();
                                codeWriter.writeLine("schema: {$ref: '#/components/schemas/"+ objInterface.source.name +"'}");
                                codeWriter.outdent();
                                codeWriter.outdent();
                                codeWriter.writeLine("description: OK");
                            
                                codeWriter.outdent();
                                codeWriter.outdent();
                                codeWriter.outdent();
                            }else if(objOperation.name.toUpperCase()=="PATCH"){
                                codeWriter.writeLine("patch:");
                                codeWriter.indent();
    
                                codeWriter.writeLine("tags:");
                                codeWriter.indent();
                                codeWriter.writeLine("- " + objInterface.target.name);
                                codeWriter.outdent();
    
                                codeWriter.writeLine("description:  Update " +objInterface.source.name);
                                codeWriter.writeLine("parameters:");
                                this.buildParameter(codeWriter,operationAttribute.name,"path",(operationAttribute.documentation?this.buildDescription(operationAttribute.documentation):"missing description"),true,"{type: string}")
                              
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
                    }

                    if(objInterface.target.ownedElements.length>0){
                        console.log("Interface Relationship : ",objInterface);
                        let interfaceRelation = objInterface.target.ownedElements;
                        interfaceRelation.forEach(interAsso => {
                            if(interAsso instanceof type.UMLAssociation){
                                if(interAsso.end2.aggregation=="composite"){
                                    this.writeInterfaceComposite(codeWriter,objInterface, interAsso);
                                }
                            }
                        });
                    }

                codeWriter.outdent();
                codeWriter.outdent();  
            }     
        });
    }

    /**
     * Description replace (') with ('')
     * @param {string} desc
     */
    buildDescription(desc){
        return desc.replace(/\'/g, "''")
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
        // codeWriter.writeLine("parameters:");
        codeWriter.writeLine("- description: " + description);
        codeWriter.indent();
        codeWriter.writeLine("in: " + type);
        codeWriter.writeLine("name: "+name);
        codeWriter.writeLine("required: " + required);
        codeWriter.writeLine("schema: " + schema);
        codeWriter.outdent();
    }

    /**
     * @function buildRequestBody
     * @param {codewrite} codeWriter 
     * @param {interface} objInterface 
     */
     buildRequestBody(codeWriter, objInterface) {
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

    /**
     * @function getEnumerationLiteral
     * @param {UMLEnumaration} objEnum 
     */
    getEnumerationLiteral(objEnum){
        let result = objEnum.literals.map(a => a.name);
        return (result);
    }

    /**
     * @function getRequiredAttributes
     * @param {UMLAttributes[]} arrAttributes 
     */
    getRequiredAttributes(arrAttributes){

        let requiredAttr = [];
         arrAttributes.forEach(item => {
            if(item.multiplicity=="1" || item.multiplicity=="1..*"){
                requiredAttr.push(item.name);
            }
            
        });
        return (requiredAttr);
    }

    /**
     * @function writeAssociationProperties
     * @param {codeWriter} codeWriter 
     * @param {UMLAssociation} assciation 
     */
    writeAssociationProperties(codeWriter, assciation){
        codeWriter.writeLine(assciation.name+":");
        codeWriter.indent();
        codeWriter.writeLine("properties:");
        codeWriter.indent();
        
        assciation.end2.reference.attributes.forEach(attr => {
            if(attr.isID){
                codeWriter.writeLine(attr.name+":");
                codeWriter.indent();
                codeWriter.writeLine("description: '"+(attr.documentation?this.buildDescription(attr.documentation):"missing description")+"'");
                codeWriter.writeLine("type: "+  this.getType(attr.type) );
                codeWriter.outdent();
            }
        });
        codeWriter.outdent();
        codeWriter.outdent();
    }


    /**
     * @function writeAssociationClassProperties
     * @param {codeWriter} codeWriter 
     * @param {UMLAssociationClass} associationClass 
     */
    writeAssociationClassProperties(codeWriter, associationClass){

        var end2Attributes = associationClass.associationSide.end2.reference.attributes;
        var classSideAtributes = associationClass.classSide.attributes;
        codeWriter.writeLine(associationClass.classSide.name+":");
        codeWriter.indent();
       
        codeWriter.writeLine("properties:");
        codeWriter.indent();

        classSideAtributes.forEach(attr => {
                codeWriter.writeLine(attr.name+":");
                codeWriter.indent();
                codeWriter.writeLine("description: '"+(attr.documentation?this.buildDescription(attr.documentation):"missing description")+"'");
                codeWriter.writeLine("type: "+  this.getType(attr.type) );
                if(attr.type instanceof type.UMLEnumeration){
                    codeWriter.writeLine("enum: [" + this.getEnumerationLiteral(attr.type) +"]");                            
                }   
                codeWriter.outdent();
          
        });

        end2Attributes.forEach(attr => {
            if(attr.isID){
                codeWriter.writeLine(attr.name+":");
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
        codeWriter.outdent();

    }

    /**
     * @function writeInterfaceComposite
     * @param {codeWriter} codeWriter 
     * @param {UMLInterfaceRealization} interfaceRealization 
     * @param {UMLAssociation} interfaceAssociation 
     */
    writeInterfaceComposite(codeWriter,interfaceRealization, interfaceAssociation){
        let end1Interface = interfaceAssociation.end1;
        let end2Interface = interfaceAssociation.end2;
        
       interfaceRealization.target.operations.forEach(objOperation =>{
            if(objOperation.name.toUpperCase()=="GET"){
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
    }
      
}

exports.OpenApiGenerator = OpenApiGenerator;