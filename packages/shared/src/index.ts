export enum TaskStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE_WAITING_APPROVAL = 'DONE_WAITING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum LocationType {
  ORGANIZATION = 'ORGANIZATION',
  FLOOR = 'FLOOR',
  ROOM = 'ROOM',
  AREA = 'AREA'
}

export enum RequestChannel {
  QR_WEB = 'QR_WEB'
}
