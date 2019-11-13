const openAPI = require('./src/openapi');
const constant = require('./src/constant');
var fs = require('fs');
var path = require('path');
const title = require('./package.json').title;
const description = require('./package.json').description;
let vDialog = null;
var forEach = require('async-foreach').forEach;
var diagramEle = require('./src/diagram/diagramElement');

/**
 * @function generateSpecs
 * @description Generates OpenAPI Specification When user select generate specs from Tools->OpenAPI-> Generate Specs
 * @param {UMLPackage} umlPackage
 * @param {Object} options
 */
function generateSpecs(umlPackage, options = getGenOptions()) {
     /* There are two modes of extension, TEST & GENERATE. Here we set APP_MODE_GEN. */
     openAPI.setAppMode(openAPI.APP_MODE_GEN); /* 0 mode for Generate API */
     /* If umlPackage is not assigned, popup ElementPicker */
     if (!umlPackage) {
          /* Open element picker dialog to pick package */
          app.elementPickerDialog
               .showDialog(constant.DIALOG_MSG_PICKERDIALOG, null, null) /* type.UMLPackage */
               .then(function ({
                    buttonId,
                    returnValue
               }) {
                    if (buttonId === "ok") {
                         let varSel = returnValue.getClassName();
                         let valPackagename = type.UMLPackage.name;
                         let valClassDiagram = type.UMLClassDiagram.name;
                         if (varSel == valClassDiagram) {

                              openAPI.setModelType(openAPI.APP_MODEL_DIAGRAM);
                              let tempPackage = diagramEle.filterUMLClassDiagram(returnValue);
                              let mNewDiagram = app.repository.readObject(tempPackage);
                              console.log(mNewDiagram);

                              fileTypeSelection(mNewDiagram, options);

                         } else if (varSel == valPackagename) {
                              openAPI.setModelType(openAPI.APP_MODEL_PACKAGE);
                              umlPackage = returnValue;
                              fileTypeSelection(umlPackage, options);
                         } else {
                              app.dialogs.showErrorDialog(constant.DIALOG_MSG_ERROR_SELECT_PACKAGE);
                         }
                    }
               });
     }
}
async function getUMLModelForDiagram(message,tempPackage, basePath, options, returnValue) {

     const mOpenApi = new openAPI.OpenApi(tempPackage, basePath, options, returnValue);
     let dm = app.dialogs;
     vDialog = dm.showModalDialog("", constant.titleopenapi, message, [], true);
     try {
          let result = await diagramEle.initUMLDiagram();
          console.log("initialize", result);
          let resultElement = await diagramEle.getDiagramElements();
          console.log("resultElement", resultElement);
          let resultGen = await diagramEle.generateOpenAPI(mOpenApi);
          console.log("resultGen", resultGen);
          if (resultGen.result == constant.FIELD_SUCCESS) {
               vDialog.close();
               console.log("mPackage", tempPackage);
               setTimeout(function () {
                    removeDiagram(tempPackage);
                    app.dialogs.showInfoDialog(resultGen.message);
                    vDialog = null;
               }, 10);
          }
     } catch (err) {
          removeDiagram(tempPackage);
          vDialog.close();
          setTimeout(function () {
               app.dialogs.showErrorDialog(err.message);
               console.error("Error getUMLModel", err);
               vDialog = null;
          }, 10);
     }
}

function removeDiagram(tempPackage) {
     let operationBuilder = app.repository.getOperationBuilder()
     operationBuilder.begin('remove item')
     operationBuilder.remove(tempPackage);
     operationBuilder.end();
     var cmd = operationBuilder.getOperation()
     app.repository.doOperation(cmd)
     console.log("mPackage", tempPackage);
}
async function getUMLModelForPackage(message,tempPackage, basePath, options, returnValue) {
     const mOpenApi = new openAPI.OpenApi(tempPackage, basePath, options, returnValue);
     let dm = app.dialogs;
     vDialog = dm.showModalDialog("", constant.titleopenapi, message, [], true);

     try {
          let result = await mOpenApi.initUMLPackage()
          console.log("initialize", result);
          let resultElement = await mOpenApi.getModelElements();
          console.log("resultElement", resultElement);
          let resultGen = await mOpenApi.generateOpenAPI();
          console.log("resultGen", resultGen);
          if (resultGen.result == constant.FIELD_SUCCESS) {
               vDialog.close();
               setTimeout(function () {
                    app.dialogs.showInfoDialog(resultGen.message);

               }, 10);
               vDialog = null;
          }


     } catch (err) {
          vDialog.close();
          setTimeout(function () {
               app.dialogs.showErrorDialog(err.message);
               console.error("Error getUMLModel", err);
          }, 10);
     }
}
/**
 * @function fileTypeSelection
 * @description Display dropdown dialog and allow user to select file type from dropdown dailog like (JSON & YAML, JSON, YAML)
 * @param {UMLPackage} umljPackage
 * @param {Object} options
 */
function fileTypeSelection(tempPackage, options) {

     app.dialogs.showSelectDropdownDialog(constant.msg_file_select, constant.fileOptions).then(function ({
          buttonId,
          returnValue
     }) {
          if (buttonId === 'ok') {
               const basePath = app.dialogs.showSaveDialog(constant.msg_file_saveas, null, null);
               if (basePath != null) {

                    setTimeout(function () {
                         let message='';
                         if (openAPI.getModelType() == openAPI.APP_MODEL_PACKAGE) {
                              message="Please wait untill OpenAPI spec generation is being processed for the \'" + tempPackage.name + "\' package";
                              getUMLModelForPackage(message,tempPackage, basePath, options, returnValue);
                         } else if (openAPI.getModelType() == openAPI.APP_MODEL_DIAGRAM) {
                              message="Please wait untill OpenAPI spec generation is being processed for the \'" + tempPackage.name + "\' diagram";
                              getUMLModelForDiagram(message,tempPackage, basePath, options, returnValue);
                         }
                    }, 10);

               } else {
                    console.log("Dialog cancelled : basePath not available")
               }
          } else {
               console.log("Dialog cancelled")
          }
     });
}

/**
 * @function getGenOptions
 * @description returns the app preferences stored by user
 * @returns {Object} 
 */
function getGenOptions() {
     return {
          idlDoc: app.preferences.get(constant.PREF_GENDOC),
          indentSpaces: [],
          debug: app.preferences.get(constant.PREF_DEBUG_KEY)
     };
}

/**
 * @function testSinglePackage
 * @description Test single package which user has selected from elementPickerDialog
 */
function testSinglePackage() {
     
     let _this = this;
     /* There are two modes of extension, TEST & GENERATE. Here we set TEST mode. */
     openAPI.setAppMode(openAPI.APP_MODE_TEST);
     /* There are two modes of TEST, TEST_MODE_SINGLE & TEST_MODE_ALL. Here we set TEST_MODE_SINGLE) */
     openAPI.setTestMode(openAPI.TEST_MODE_SINGLE);
     /* Open element picker dialog to pick package */
     app.elementPickerDialog
          .showDialog(constant.DIALOG_MSG_TEST_PICKERDIALOG, null, null) /* type.UMLPackage */
          .then(function ({
               buttonId,
               returnValue
          }) {
               if (buttonId === "ok") {
                    let varSel = returnValue.getClassName();
                    let valPackagename = type.UMLPackage.name;
                    let valClassDiagram = type.UMLClassDiagram.name;
                    if (varSel == valClassDiagram) {

                         openAPI.setModelType(openAPI.APP_MODEL_DIAGRAM);
                         let tempPackage = diagramEle.filterUMLClassDiagram(returnValue);
                         let mNewDiagram = app.repository.readObject(tempPackage);
                         removeOutputFiles();
                         let message="Please wait untill OpenAPI spec generation is being tested for the \'" + mNewDiagram.name + "\' diagram";
                         setTimeout(function () {
                              testSingleOpenAPI(message,mNewDiagram);
                         }, 10);

                    } else if (varSel == valPackagename) {
                         openAPI.setModelType(openAPI.APP_MODEL_PACKAGE);
                         umlPackage = returnValue;
                         /* let result=await removeOutputFiles(); */
                         removeOutputFiles();
                         /*  console.log("Result",result); */

                         let message = "Please wait untill OpenAPI spec generation is being tested for the \'" + umlPackage.name + "\' package";
                         setTimeout(function () {
                              testSingleOpenAPI(message,umlPackage);
                         }, 10);

                    } else {
                         app.dialogs.showErrorDialog(constant.DIALOG_MSG_ERROR_SELECT_PACKAGE);
                    }
               }
          });

}
/**
 * @function removeOutputFiles
 * @description Remove previously test generated .json files from the output folder
 */
function removeOutputFiles() {
     /* return new Promise((resolve, reject) => { */


     const directory = __dirname + constant.IDEAL_TEST_FILE_PATH;

     if (!fs.existsSync(directory)) {
          fs.mkdirSync(directory);
     }

     fs.readdir(directory, (err, files) => {
          if (err) throw err;

          for (const file of files) {
               fs.unlink(path.join(directory, file), err => {
                    if (err) throw err;
               });
          }
     });

}

/**
 * @function starTestingAllPackage
 * @description Start testing all packages one by one of the project
 * @params {UMLPackage} item
 */
async function starTestingAllPackage(pkgList) {
     let strModeType = '';
     if (openAPI.getModelType() == openAPI.APP_MODEL_PACKAGE) {
          strModeType = ' for Package : ';
     } else if (openAPI.getModelType() == openAPI.APP_MODEL_DIAGRAM) {
          strModeType = ' for Diagram : ';
     }

     removeOutputFiles();

     let strSummery = '';

     for (const umlPackage of pkgList) {

          const basePath = __dirname + constant.IDEAL_TEST_FILE_PATH;
          const options = getGenOptions();
          const mOpenApi = new openAPI.OpenApi(umlPackage, basePath, options, 1);
          try {
               let result = await mOpenApi.initUMLPackage()
               console.log("initialize", result);
               let resultElement = await mOpenApi.getModelElements();
               console.log("resultElement", resultElement);
               let resultGen = await mOpenApi.generateOpenAPI();
               console.log("resultGen", resultGen);

          } catch (err) {
               /*  app.dialogs.showErrorDialog(err.message); */
               console.error("Error startTestingAllPackage", err);
               if (openAPI.getError().hasOwnProperty('isDuplicate') && openAPI.getError().isDuplicate == true) {

                    let arrPath = openAPI.findHierarchy(umlPackage);
                    let pkgPath = openAPI.reversePkgPath(arrPath);

                    let bindFailureMsg = constant.msgtesterror + strModeType + '\'' + openAPI.getUMLPackage().name + '\' {' + pkgPath + '}' + '\n' + constant.strerror + openAPI.getError().msg;
                    openAPI.addSummery(bindFailureMsg, 'failure');
               }
          }
     }
     vDialog.close();
     vDialog = null;
     setTimeout(function () {

          console.log('Done!');
          let summery = openAPI.getSummery();
          let status = 'success';
          summery.filter((item, index) => {
               if (item.status == 'failure') {
                    status = 'failure'
               }
               strSummery += item.message + '\n\n';
          });
          if (status == 'success') {
               app.dialogs.showInfoDialog(strSummery);
          } else {
               app.dialogs.showErrorDialog(strSummery);
          }
     }, 10);
}

/**
 * @function testSingleOpenAPI
 * @params {UMLPackage} umlPackage
 * @description Async function to generate test api 
 * */
async function testSingleOpenAPI(message,umlPackage) {

     const basePath = __dirname + constant.IDEAL_TEST_FILE_PATH;
     const options = getGenOptions();
     if (openAPI.getModelType() == openAPI.APP_MODEL_PACKAGE) {
          getUMLModelForPackage(message,umlPackage, basePath, options, 1);
     } else if (openAPI.getModelType() == openAPI.APP_MODEL_DIAGRAM) {
          getUMLModelForDiagram(message,umlPackage, basePath, options, 1);
     }
}

/**
 * @function testEntireProject
 * @description Test Entire Project for valid OpenApi Specifications
 */
function testEntireProject() {
     openAPI.setModelType(openAPI.APP_MODEL_PACKAGE);
     var packages = app.repository.select("@UMLPackage")

     /* reset old stored error summery */
     openAPI.resetSummery();
     /* There are two modes of extension, TEST & GENERATE. Here we set APP_MODE_TEST. */
     openAPI.setAppMode(openAPI.APP_MODE_TEST);
     /* There are two modes of TEST, TEST_MODE_SINGLE & TEST_MODE_ALL. Here we set TEST_MODE_ALL) */
     openAPI.setTestMode(openAPI.TEST_MODE_ALL);

     let mPackages = [];
     packages.forEach(element => {
          if (element instanceof type.UMLPackage) {
               mPackages.push(element);
          }
     });
     vDialog = null;
     let dm = app.dialogs;
     vDialog = dm.showModalDialog("", constant.titleopenapi, "Please wait untill OpenAPI spec testing is being processed for the entire project.", [], true);
     setTimeout(function () {

          starTestingAllPackage(mPackages);
     }, 10);
}

/**
 * @function aboutUsExtension
 * @description Display Information about Extension like the title and description of OpenAPI Specification.
 */

function aboutUsExtension() {
     app.dialogs.showInfoDialog(title + "\n\n" + description);
}

/**
 * @function init
 * @description function will be called when the extension is loaded
 */
function init() {
     /* Register command to Generate Specification */
     app.commands.register('openapi:generate-specs', generateSpecs);
     /* Register command to Test Single Pacakge */
     app.commands.register('openapi:test-single-package', testSinglePackage /* swaggerTest */ );
     /* Register command to Test Entire Project */
     app.commands.register('openapi:test-entire-package', testEntireProject);
     /* Register command to Display Extension information in dialog */
     app.commands.register('openapi:about-us', aboutUsExtension);

}

exports.init = init