enum SIPProtocol {
  SIP = 'SIP/',
  PJSIP = 'PJSIP/'
}

type ChannelData = {
  sipProtocol: SIPProtocol;
  trunkName: string;
  phoneNumber: number;
};

export { ChannelData, SIPProtocol };
