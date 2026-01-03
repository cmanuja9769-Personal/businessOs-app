import NetInfo from '@react-native-community/netinfo';

export class NetworkService {
  static async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  static subscribeToNetworkChanges(callback: (isConnected: boolean) => void) {
    return NetInfo.addEventListener((state) => {
      callback(state.isConnected ?? false);
    });
  }
}
