# Azure SQL Data Warehouse Deployment

### Overview:

The task is used to deploy Azure SQL Data Warehouse to an existing Azure SQL Server, either by using DACPACs or SQL scripts. [DACPACs](https://msdn.microsoft.com/en-IN/library/ee210546.aspx) are deployed using [SqlPackage.exe](#1) and [SQL scripts](https://msdn.microsoft.com/en-IN/library/hh245282.aspx) are deployed using the [Invoke-Sqlcmd cmdlet](https://msdn.microsoft.com/en-IN/library/cc281720.aspx). DACPACs and SqlPackage.exe and Invoke-Sqlcmd cmdlet provides for fine-grained control over the database creation and upgrades, including upgrades for schema, triggers, stored procedures, roles, users,  etc. Using the task, multiple different properties can be set to ensure that the database is created or upgraded properly.

### Contact Information

Please report a problem at [Developer Community Forum](https://developercommunity.visualstudio.com/spaces/21/index.html) if you are facing problems in making this task work.  You can also share feedback about the task like, what more functionality should be added to the task, what other tasks you would like to have, at the same place.

### Pre-requisites for the task

The following pre-requisites need to be setup for the task to work properly.

##### Azure Subscription

To deploy Azure SQL Data Warehouse, an Azure subscription has to be linked to Team Foundation Server or to Azure Pipelines using the Services tab in the Account Administration section. Add the Azure subscription to use in the Build or Release Management definition by opening the Account Administration screen (gear icon on the top-right of the screen) and then click on the Services Tab.

- For Azure Classic resources use 'Azure' endpoint type with Certificate or Credentials based authentication. If you are using credentials based auth, ensure that the credentials are for a [**work account**](https://azure.microsoft.com/en-in/pricing/member-offers/msdn-benefits-details/work-accounts-faq/) because Microsoft accounts like [**joe@live.com**](https://github.com/Microsoft/azure-pipelines-tasks/blob/master/Tasks/DeployAzureResourceGroup) or [**joe@hotmail.com**](https://github.com/Microsoft/azure-pipelines-tasks/blob/master/Tasks/DeployAzureResourceGroup) are not supported.

- For [ARM](https://azure.microsoft.com/en-in/documentation/articles/resource-group-overview/), use 'Azure Resource Manager' endpoint type, for more details follow the steps listed in the link [here](https://go.microsoft.com/fwlink/?LinkID=623000&clcid=0x409).

For Azure MSDN accounts, one can either use a [Service Principal](https://go.microsoft.com/fwlink/?LinkID=623000&clcid=0x409) or a work account. It's easy to create a work account as shown below:

1. Create an user in the Azure Active Directory from the [portal](https://msdn.microsoft.com/en-us/library/azure/hh967632.aspx) (this is the old Azure portal). After adding the account, the following two things need to be done to use the organization in Azure Pipelines:
  - Add the Active Directory account to the co-administrators in the subscription. Go to the Settings and then click on administrators and add the account as a co-admin like, [testuser@joehotmail.onmicrosoft.com](mailto:testuser@joehotmail.onmicrosoft.com)
  - Login to the portal with this Active Directory account wiz. [testuser@joehotmail.onmicrosoft.com](mailto:testuser@joehotmail.onmicrosoft.com), and change the password. Initially a temporary password is created and that needs to be changed at the first login.
2. Add that user and password in the service connections in the Azure Pipelines and deployments will work with that account.

##### Azure SQL Server

There should be an Azure SQL Server that is already pre-created in the [Azure portal](https://ms.portal.azure.com/#create/Microsoft.SQLServer). The task deploys Azure SQL Data Warehouse but does not create an Azure SQL server.

##### Automation Agent

The task runs on the automation agent machine and the following needs to be installed on the machine:

1. For deploying DACPACs, SqlPackage.exe is used and can be installed with Visual Studio 2019. Visual Studio 2019 installs the SqlPackage.exe at: C:\Program Files (x86)\Microsoft Visual Studio\2019\ {Your VS Version} \Common7\IDE\Extensions\Microsoft\SQLDB\DAC\150. 
  
2. For deploying SQL Scripts, [Invoke-Sqlcmd cmdlet](https://msdn.microsoft.com/en-IN/library/cc281720.aspx) is used, and can be installed by the following -
    * Download and install the following components of [Microsoft SQL Server 2016 Feature Pack ](https://www.microsoft.com/en-us/download/details.aspx?id=52676). On an x86 machine, only install the x86 version of the MSIs, and on an x64 machine, install both the x86 and the x64 versions of the MSIs.
      - Microsoft® System CLR Types for Microsoft SQL Server® 2016 (SQLSysClrTypes.msi).
      - Microsoft® SQL Server® 2016 Shared Management Objects (SharedManagementObjects.msi).
      - Microsoft® Windows PowerShell Extensions for Microsoft SQL Server® 2016 (PowerShellTools.msi).

##### Azure PowerShell

The task needs the Azure PowerShell version to be installed on the automation agent, and that can be done easily using the [Azure PowerShell Installer v1.3.0](https://github.com/Azure/azure-powershell/releases/tag/v1.3.0-March2016). Refer to "Supported Azure and AzureRM module versions" section below for recommended versions.

### Parameters of the task:

The parameters of the task are described in details, including examples, to show how to input the parameters. The parameters listed with a \* are required parameters for the task:

**Azure Subscription Connection Details**

- **Azure Connection Type\*:** Specify Azure endpoint type, for Azure Classic resources use 'Azure' endpoint, for Azure ARM resources use 'Azure Resource Manager' endpoint.

- **Azure Subscription\*:** Select the Azure Subscription where Azure SQL Data Warehouse will be deployed.

**SQL DW Details**

- **Azure SQL Server Name\*:** The connection string for Azure SQL Server - the format is the same as SQL Server Management Studio. For example, FabrikamSQL.database.windows.net, 1433 or FabrikamSQL.database.windows.net are both valid Azure SQL Server names.

- **Data Warehouse Name\*:** The name of the Azure SQL data warehouse like FabrikanDB. The database will be created new if it does not exist, else it will be updated if it already exists.

- **SQL Username\*:** The Azure SQL Data Warehouse task uses SQL Authentication to authenticate with the Azure SQL Server and this parameter specifies the Azure SQL Data Warehouse administrator login.

- **SQL Password\*:** The password for the database administrator.

**Deployment Package**

- **Type\*:** Select one of the options from SQL DACPAC File, or SQL Script File, or Inline SQL Script.

**SQL DACPAC File:** Fill in the following options for deploying the SQL DACPAC file.

- **DACPAC File\*:** Location of the DACPAC file on the automation agent or on a UNC path that is accessible to the automation agent like, \\BudgetIT\Web\Deploy\FabrikamDB.dacpac. Predefined [system variables](https://msdn.microsoft.com/Library/vs/alm/Build/scripts/variables) like, $(agent.releaseDirectory), can be also used here. Be sure to specify the full path like $(Build.Repository.LocalPath)\BudgetIT\Fabrikam.dacpac.

- **Publish Profile:** Publish profile provide fine-grained control over Azure SQL Data Warehouse creation or upgrades. Specify the path to the Publish profile XML file on the automation agent or on a UNC share that is accessible by the automation agent. As described for the DACAC file location, system variables or wildcards can be also used here. This is an optional parameter.

- **Additional SqlPackage.exe Arguments:** Additional SqlPackage.exe arguments that will be applied when creating or updating Azure SQL Data Warehouse like: /p:IgnoreAnsiNulls=True /p:IgnoreComments=True

  These arguments will override the settings in the Publish profile XML file (if provided). A full list of the arguments that can provided is listed in the ' **Properties**' sub-section of the ' **Publish Parameters, Properties, and SQLCMD Variables**' in the [SqlPackage.exe](https://msdn.microsoft.com/en-us/library/hh550080\(v=vs.103\).aspx) documentation. The SQLCMD variables can be also specified here. This is an optional parameter.

**SQL Script File:** Fill in the following options for running SQL Script files against Azure SQL Data Warehouse.

- **SQL Script\*:** Location of the SQL Script file on the automation agent or on a UNC path that is accessible to the automation agent like, \\BudgetIT\Web\Deploy\FabrikamDB.sql. Predefined [system variables](https://msdn.microsoft.com/Library/vs/alm/Build/scripts/variables) like, $(agent.releaseDirectory), can be also used here. Be sure to specify the full path like $(Build.Repository.LocalPath)\BudgetIT\Fabrikam.sql.

- **Additional Invoke-Sqlcmd cmdlet Arguments:** Additional [Invoke-Sqlcmd cmdlet](https://msdn.microsoft.com/en-IN/library/cc281720.aspx) arguments that will be applied when creating or updating Azure SQL Data Warehouse like:
        -ConnectionTimeout 100 -OutputSqlError

**Inline SQL Script:** Fill in the following options for running inline SQL Scripts against Azure SQL Data Warehouse.

- **Inline SQL Script\*:** Enter the SQL Script to run against Azure SQL Data Warehouse.

- **Additional Invoke-Sqlcmd cmdlet Arguments:** Additional [Invoke-Sqlcmd cmdlet](https://msdn.microsoft.com/en-IN/library/cc281720.aspx) arguments that will be applied when creating or updating Azure SQL Data Warehouse like:
        -ConnectionTimeout 100 -OutputSqlError

**Azure SQL Server Firewall**

- **Specify Firewall Rules Using\*** : For the task to run, the IP Address of the automation agent has to be added to the 'Allowed IP Addresses' in the Azure SQL Server's Firewall. Provide the IP Address range of the automation agents, or select to auto-detect the IP Address of the agent where this task will run.

- **Start IP Address\*:** The starting IP Address of the automation agent machine pool like 196.21.30.50.

- **End IP Address\*:** The ending IP Address of the automation agent machine pool like 196.21.30.65.

- **Delete Rule After Task Ends\*:** If selected then after the task ends, the IP Addresses specified here are deleted from the 'Allowed IP Addresses' list of the Azure SQL Server's Firewall.

### Known Limitations :

- The auto-detection of the automation agent's IP Address only works with hosted automation agent in Azure Pipelines and not in Team Foundation Server (TFS).
- The task does not put in a demand for SQL Server PowerShell and that is needed for running the SQL Scripts against the Azure SQL Data Warehouse. Install the [Microsoft SQL Server 2016 Feature Pack ](https://www.microsoft.com/en-us/download/details.aspx?id=52676) as described above, else the task will fail to deploy the SQL Scripts.
- The Azure SQL Data Warehouse Deployment task does not support BACPAC. 

### Supported Azure and AzureRM module versions:
Recommended:
[Azure PowerShell Installer v1.3.0](https://github.com/Azure/azure-powershell/releases/tag/v1.3.0-March2016)

Other supported versions:
[Azure PowerShell Installer v0.9.8](https://github.com/Azure/azure-powershell/releases/tag/v0.9.8-September2015)

#1 https://msdn.microsoft.com/en-us/library/hh550080\(v=vs.103\).aspx

### Troubleshooting :

- **Get debug logs to diagnose problems**
    Start by looking at the logs in your completed build/release. If they don't provide enough detail, you can make them more verbose:
    * On the Variables tab, add system.debug and set it to true.
    * Queue the Build/Release

- **Unable to connect to master or target server ‘xyz’. You must have a user with the same password in master or target server ‘xyz’.**
    * Possible cause of failure include connection failures :
        * Check if any firewall rules are preventing the connection.
        * Check if the supplied credentials have appropriate permission to either the master DB or the specific DB.
        * Check if the SQL server name resolution succeeds.
	* DAC tooling is not up to date and the target database is configured with an incompatible Compatibility Level. It tend to happen when Azure SQL receives an update and you are deploying on a new database. You can either update DAC tooling on self hosted agent or [reduce the compatibility level of your DB](https://azure.microsoft.com/en-us/blog/default-compatibility-level-140-for-azure-sql-databases/)
- **Connection timed out**
    * Consider using /TargetTimeout: property for connections that times out
