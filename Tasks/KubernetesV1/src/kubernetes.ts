"use strict";

import tl = require('azure-pipelines-task-lib/task');
import path = require('path');

import ClusterConnection from "./clusterconnection";
import * as kubectlConfigMap from "./kubernetesconfigmap";
import * as kubectlSecret from "./kubernetessecret";
import { getNameSpace } from "./kubernetescommand";
import trm = require('azure-pipelines-task-lib/toolrunner');
import { getDeploymentMetadata, IsJsonString, getPublishDeploymentRequestUrl, isDeploymentEntity } from 'kubernetes-common-v2/image-metadata-helper';
import { WebRequest, WebResponse, sendRequest } from 'utility-common-v2/restutilities';

tl.setResourcePath(path.join(__dirname, '..', 'task.json'));
// Change to any specified working directory
tl.cd(tl.getInput("cwd"));

var registryType = tl.getInput("containerRegistryType", true);
var command = tl.getInput("command", false);
const environmentVariableMaximumSize = 32766;
const addPipelineMetadata = tl.getVariable("ADD_PIPELINE_METADATA");

var kubeconfigfilePath;
if (command === "logout") {
    kubeconfigfilePath = tl.getVariable("KUBECONFIG");
}
// open kubectl connection and run the command
var connection = new ClusterConnection(kubeconfigfilePath);
try {
    connection.open().then(
        () => { return run(connection, command) }
    ).then(
        () => {
            tl.setResult(tl.TaskResult.Succeeded, "");
            if (command !== "login") {
                connection.close();
            }
        }
        ).catch((error) => {
            tl.setResult(tl.TaskResult.Failed, error.message)
            connection.close();
        });
}
catch (error) {
    tl.setResult(tl.TaskResult.Failed, error.message);
}

async function run(clusterConnection: ClusterConnection, command: string) {
    var secretName = tl.getInput("secretName", false);
    var configMapName = tl.getInput("configMapName", false);

    if (secretName) {
        await kubectlSecret.run(clusterConnection, secretName);
    }

    if (configMapName) {
        await kubectlConfigMap.run(clusterConnection, configMapName);
    }

    if (command) {
        await executeKubectlCommand(clusterConnection, command);
    }
}

function getAllPods(connection: ClusterConnection): trm.IExecSyncResult {
    const command = connection.createCommand();
    command.arg('get');
    command.arg('pods');
    command.arg(['-o', 'json']);
    command.arg(getNameSpace());
    return command.execSync({ silent: true } as trm.IExecOptions);
}

function getClusterInfo(connection: ClusterConnection): trm.IExecSyncResult {
    const command = connection.createCommand();
    command.arg('cluster-info');
    return command.execSync({ silent: true } as trm.IExecOptions);
}

// execute kubectl command
function executeKubectlCommand(clusterConnection: ClusterConnection, command: string): any {
    var commandMap = {
        "login": "./kuberneteslogin",
        "logout": "./kuberneteslogout"
    }

    var commandImplementation = require("./kubernetescommand");
    if (command in commandMap) {
        commandImplementation = require(commandMap[command]);
    }

    var telemetry = {
        registryType: registryType,
        command: command,
        jobId: tl.getVariable('SYSTEM_JOBID')
    };

    console.log("##vso[telemetry.publish area=%s;feature=%s]%s",
        "TaskEndpointId",
        "KubernetesV1",
        JSON.stringify(telemetry));

    // The output result can contain more than one Json objects
    // We want to parse each of the objects separately, hence push the output in JSON array form    
    var result = [];
    return commandImplementation.run(clusterConnection, command, (data) => result.push(data))
        .fin(function cleanup() {
            console.log("commandOutput" + result);
            var commandOutputLength = result.length;
            if (commandOutputLength > environmentVariableMaximumSize) {
                tl.warning(tl.loc("OutputVariableDataSizeExceeded", commandOutputLength, environmentVariableMaximumSize));
            } else {
                tl.setVariable('KubectlOutput', result.toString());
            }

            if (addPipelineMetadata && addPipelineMetadata.toLowerCase() == "true") {
                // For each output, check if it contains a JSON object
                result.forEach(res => {
                    if (IsJsonString(res)) {
                        const jsonResult = JSON.parse(res);
                        // Check if the output contains a deployment
                        if (isDeploymentEntity(jsonResult.kind)) {
                            // Get all the pods in this cluster
                            try {
                                const allPods = JSON.parse(getAllPods(clusterConnection).stdout);
                                const clusterInfo = getClusterInfo(clusterConnection).stdout;
                                const metadata = getDeploymentMetadata(jsonResult, allPods, "None", clusterInfo);
                                const requestUrl = getPublishDeploymentRequestUrl();
                                sendRequestToImageStore(JSON.stringify(metadata), requestUrl).then((result) => {
                                    tl.debug("DeploymentDetailsApiResponse: " + JSON.stringify(result));
                                }, (error) => {
                                    tl.warning("publishToImageMetadataStore failed with error: " + error);
                                });
                            }
                            catch (e) {
                                tl.warning("Capturing deployment metadata failed with error: " + e);
                            }
                        }
                    }
                });
            }
        });
}

async function sendRequestToImageStore(requestBody: string, requestUrl: string): Promise<any> {
    const request = new WebRequest();
    const accessToken: string = tl.getEndpointAuthorizationParameter('SYSTEMVSSCONNECTION', 'ACCESSTOKEN', false);
    request.uri = requestUrl;
    request.method = 'POST';
    request.body = requestBody;
    request.headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + accessToken
    };

    tl.debug("requestUrl: " + requestUrl);
    tl.debug("requestBody: " + requestBody);
    tl.debug("accessToken: " + accessToken);

    try {
        tl.debug("Sending request for pushing deployment data to Image meta data store");
        const response = await sendRequest(request);
        return response;
    }
    catch (error) {
        tl.debug("Unable to push to deployment details to Artifact Store, Error: " + error);
    }

    return Promise.resolve();
}
