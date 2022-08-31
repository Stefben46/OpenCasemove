

export interface DispatchStoreBuildingObject {
  name: string
  action: Function
}
export type DispatchStoreHandleBuildingOptionsClass = {
  [key in keyof DispatchStoresettingsOptions]: DispatchStoreBuildingObject;
}

export interface DispatchStoresettingsOptions {
  source: string
  personaState: string,
  locale: string
  os: string
  columns: string
  devmode: string
  fastmove: string
  currency: string
}


// Store
export interface DispatchIPCBuildingObject {
  endpoint: Function
  action: Function
}
export type DispatchIPCHandleBuildingOptionsClass = {
  [key in keyof DispatchIPCsettingsOptions]: DispatchIPCBuildingObject;
}

export interface DispatchIPCsettingsOptions {
  currency: string
}
