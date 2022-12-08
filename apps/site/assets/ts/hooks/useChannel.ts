import { useReducer, useEffect, Reducer } from "react";
import { joinChannel, leaveChannel, SocketEvent } from "../app/channels";

export default function useChannel<
  DataType,
  StateType,
  ActionType extends SocketEvent<DataType[]>
>(
  channelId: string,
  reducer: Reducer<StateType, ActionType>,
  initialData: StateType
): StateType {
  const [state, dispatch] = useReducer(reducer, initialData);

  useEffect(() => {
    joinChannel<DataType[]>(channelId);

    return () => {
      leaveChannel(channelId);
    };
  }, [channelId]);

  useEffect(() => {
    // update state when the channel's custom event is emitted
    const onChannelData = (event: CustomEvent<ActionType>): void => {
      // includes any additional variables from the state, but replace the action with the new socket event data.
      dispatch(event.detail);
    };
    document.addEventListener(channelId, onChannelData as EventListener);

    return () => {
      document.removeEventListener(channelId, onChannelData as EventListener);
    };
  }, [channelId, dispatch]);

  return state;
}
