const ErrorCode = {
  ParticipantMinimumUnsatisfied: 1050,
  ParticipantMaximumExceeded: 1051,
};
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
