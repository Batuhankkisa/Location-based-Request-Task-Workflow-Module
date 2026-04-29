export type AuthStackParamList = {
  Login: undefined;
};

export type TasksStackParamList = {
  TaskList: undefined;
  TaskDetail: {
    taskId: string;
  };
};

export type QrsStackParamList = {
  QrList: undefined;
  QrDetail: {
    qrId: string;
  };
};

export type AppTabParamList = {
  TasksTab: undefined;
  QrsTab: undefined;
  LocationsTab: undefined;
  OrganizationsTab: undefined;
  UsersTab: undefined;
  ProfileTab: undefined;
};
