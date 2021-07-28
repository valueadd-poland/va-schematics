<p align="center">
  <img width="200" height="200" src="https://user-images.githubusercontent.com/43951141/127284972-ef7d5ac4-c94b-4876-8685-e54b7b48ac0a.png">
</p>
<p align="center">
  <a href="https://circleci.com/gh/valueadd-poland/va-schematics">
    <img src="https://circleci.com/gh/valueadd-poland/va-schematics.svg?style=svg" />
  </a>
  <a href="https://coveralls.io/r/valueadd-poland/va-schematics?branch=master">
    <img src="https://coveralls.io/repos/valueadd-poland/va-schematics/badge.svg?branch=master" />
  </a>
</p>

<p align="center">
  This is a package containing schematics for implementing NgRx Store.
</p>

# Features
* Generating NgRx state
* Generating CRUD for NgRx (for single entities and collections)
* Creating single NgRx Action
* Creating method in data-service with a given payload
* Creating single case for Reducer

# Installation

To install schematics simply run
```bash
npm i -g @valueadd/schematics
```

# Usage

## State

### Create basic state with actions, effects, reducer and selectors files (also with spec.ts)

**Properties:**

* name - name of state
* module - path to module of state
* facade - generate facade
* root - whether state is in root of application
* skipFormat - defines whether file formatting should be skipped
* skipPackageJson - skip filling package.json
* onlyAddFiles - skip filling module.ts
* onlyEmptyRoot - fill module.ts with store configuration and skip adding store files
* creators - whether to use creator NgRx syntax

**Example:**

```bash
ng g @valueadd/schematics:ngrx 
--name=todo
--module=/libs/data-access-todo/src/lib/data-access-todo.module.ts 
--root=false 
--facade
```

## CRUD

### Create CRUD operations in ngrx/store data access module

**Properties:**

* entity – entity name
* stateDir – path to +state directory
* dataService – path to data service file
* actionsPrefix – prefix used in Types enum [default: entity name] (“[__PREFIKS__] Get Todo”)
* responseType – response return type (you can specify return type for each operation by following pattern <operation>:<responseType> 
  e.g.: c:TestModel,r:TestModel)
* mapResponse – add map operator to response pipe (to specify map response for each type follow pattern from responseType)
* backend – backend to use (none, http, localStorage)
* creators - whether to use creator NgRx syntax
  
**Example:**
  
```bash
ng g @valueadd/schematics:crud 
--entity=Todo 
--dataService=/libs/data-access-todo/src/lib/services/todo-data.service.ts 
--actionsPrefix=Todo 
--stateDir=/libs/data-access-todo/src/lib/+state 
--responseType="" 
--mapResponse=""
```

## Action

### Creating single Action with given payload

**Properties:**

* name – action’s name
* stateDir – path to state directory
* prefix – action prefix in action’s type string
* payload – type of action’s payload
* skipFormat - defines whether file formatting should be skipped
* backend - backend to use (http, localStorage)
* creators - whether to use creator NgRx syntax

**Example:**
```bash
ng g @valueadd/schematics:action 
--name=EditTodo 
--stateDir=/libs/data-access-todo/src/lib/+state 
--payload=Todo 
--prefix=Todo
```
  
## Data service
  
### Create method in a given data service
  
**Properties:**
  
* dataService – the path to the data service
* entity - entity name
* collection - defines whether the method operates on the entity collection
* methodBackend – backend to use (none, http, localStorage)
* methodName – name of the method
* methodProperties – method’s properties ({name}:{type},{name2}:{type2})
* methodReturnType – method’s return type
* operation - CRUD operation to create (create, read, update, delete)
* skipFormat - defines whether file formatting should be skipped
* skipTest - defines whether creating tests should be skipped

  
**Example:**
  
```bash
ng g @valueadd/schematics:data-service 
--dataService=/libs/shared/data-access-module/src/lib/services/module-data.service.ts 
--entity=ToDo
--backend=none 
--methodName=testMethod 
--methodProperties=“data: object” 
--methodReturnType=any
```
  
## Reducer
  
### Create single case in reducer
  
**Properties:** 
  
* actionName – action’s name
* stateDir – path to state directory
* propsToUpdate – properties to update. Follow pattern: {propertyName}:{value}:{?type}. You can separate multiple properties with comma
* selectors – generate selectors for given properties
* facade – generate facade
  
**Example:**

```bash
ng g @valueadd/schematics:reducer 
--actionName=EditTodo 
--stateDir=/libs/data-access-todo/src/lib/+state 
--propsToUpdate="editingTodo:action.payload:Todo|null" 
--selectors 
--facade
```
