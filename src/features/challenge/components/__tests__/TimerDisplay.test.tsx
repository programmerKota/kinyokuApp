import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import TimerDisplay from '../TimerDisplay';

// モックデータ
const mockCurrentSession = {
    goalDays: 7,
    penaltyAmount: 1000,
};

const defaultProps = {
    actualDuration: 86400, // 1日
    currentSession: null,
    progressPercent: 0,
    isGoalAchieved: false,
    onStartPress: jest.fn(),
    onStopPress: jest.fn(),
};

describe('TimerDisplay', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render not started state correctly', () => {
        const { getByText } = render(<TimerDisplay {...defaultProps} />);

        expect(getByText('1')).toBeTruthy(); // 日数
        expect(getByText('日')).toBeTruthy();
        expect(getByText('禁欲開始')).toBeTruthy();
    });

    it('should render active state correctly', () => {
        const props = {
            ...defaultProps,
            currentSession: mockCurrentSession,
            progressPercent: 50,
        };

        const { getByText } = render(<TimerDisplay {...props} />);

        expect(getByText('1')).toBeTruthy(); // 日数
        expect(getByText('日')).toBeTruthy();
        expect(getByText('目標7日まで、 50%達成！')).toBeTruthy();
        expect(getByText('停止')).toBeTruthy();
    });

    it('should call onStartPress when start button is pressed', () => {
        const { getByText } = render(<TimerDisplay {...defaultProps} />);

        fireEvent.press(getByText('禁欲開始'));

        expect(defaultProps.onStartPress).toHaveBeenCalledTimes(1);
    });

    it('should call onStopPress when stop button is pressed', () => {
        const props = {
            ...defaultProps,
            currentSession: mockCurrentSession,
        };

        const { getByText } = render(<TimerDisplay {...props} />);

        fireEvent.press(getByText('停止'));

        expect(defaultProps.onStopPress).toHaveBeenCalledTimes(1);
    });

    it('should display correct progress percentage', () => {
        const props = {
            ...defaultProps,
            currentSession: mockCurrentSession,
            progressPercent: 75,
        };

        const { getByText } = render(<TimerDisplay {...props} />);

        expect(getByText('目標7日まで、 75%達成！')).toBeTruthy();
    });

    it('should cap progress percentage at 100%', () => {
        const props = {
            ...defaultProps,
            currentSession: mockCurrentSession,
            progressPercent: 150, // 100%を超える値
        };

        const { getByText } = render(<TimerDisplay {...props} />);

        expect(getByText('目標7日まで、 100%達成！')).toBeTruthy();
    });

    it('should display correct time format', () => {
        const props = {
            ...defaultProps,
            actualDuration: 3661, // 1時間1分1秒
        };

        const { getByText } = render(<TimerDisplay {...props} />);

        expect(getByText('0')).toBeTruthy(); // 日数
        expect(getByText('日')).toBeTruthy();
        // 時間部分はformatDuration関数の結果に依存
    });

    it('should handle zero duration', () => {
        const props = {
            ...defaultProps,
            actualDuration: 0,
        };

        const { getByText } = render(<TimerDisplay {...props} />);

        expect(getByText('0')).toBeTruthy(); // 日数
        expect(getByText('日')).toBeTruthy();
    });

    it('should handle large duration', () => {
        const props = {
            ...defaultProps,
            actualDuration: 2592000, // 30日
        };

        const { getByText } = render(<TimerDisplay {...props} />);

        expect(getByText('30')).toBeTruthy(); // 日数
        expect(getByText('日')).toBeTruthy();
    });
});

