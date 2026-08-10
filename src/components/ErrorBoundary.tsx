import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View } from "react-native";
import { MyText } from "./MyText";
import Btn from "./Buttons/Btn";

type Props = { children: ReactNode };
type State = { hasError: boolean; retryKey: number };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, retryKey: s.retryKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center bg-my-black-base p-6 gap-4">
          <MyText className="text-2xl text-my-red-light text-center">
            Something went wrong
          </MyText>
          <MyText className="text-my-white-light text-center mb-4">
            An unexpected error occurred. You can try again.
          </MyText>
          <Btn color="gold" text="Retry" onPress={this.handleRetry} />
        </View>
      );
    }

    return (
      <View key={this.state.retryKey} style={{ flex: 1 }}>
        {this.props.children}
      </View>
    );
  }
}
