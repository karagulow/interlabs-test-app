import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

type Props = {
	// Момент последней успешной загрузки данных.
	since: Date;
};

export function UpdatedAgo({ since }: Props) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const updateNow = () => setNow(Date.now());

		updateNow();

		const intervalId = setInterval(updateNow, 1000);

		return () => clearInterval(intervalId);
	}, []);

	const seconds = Math.max(0, Math.floor((now - since.getTime()) / 1000));

	return <Text style={styles.text}>Обновлено {seconds} сек назад</Text>;
}

const styles = StyleSheet.create({
	text: {
		fontSize: 13,
		color: '#6b7280',
	},
});
