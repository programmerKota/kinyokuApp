import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import Modal from './Modal';
import InputField from './InputField';
import Button from './Button';

interface CreateTournamentModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (data: { name: string; description: string }) => void;
}

const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
    visible,
    onClose,
    onCreate,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleCreate = () => {
        if (!name.trim()) {
            return;
        }
        onCreate({
            name: name.trim(),
            description: description.trim(),
        });
        setName('');
        setDescription('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            onClose={onClose}
            title="大会作成"
        >
            <InputField
                label="大会名"
                description="大会の名前を入力してください"
                placeholder="例: 30日間チャレンジ"
                value={name}
                onChangeText={setName}
                required
            />

            <InputField
                label="説明"
                description="大会の詳細を入力してください（任意）"
                placeholder="例: みんなで30日間の禁欲に挑戦しよう！"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
            />

            <View style={styles.buttons}>
                <Button
                    title="キャンセル"
                    onPress={onClose}
                    variant="secondary"
                    style={styles.button}
                />
                <Button
                    title="作成"
                    onPress={handleCreate}
                    disabled={!name.trim()}
                    style={styles.button}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    buttons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    button: {
        flex: 1,
        marginHorizontal: 8,
    },
});

export default CreateTournamentModal;

