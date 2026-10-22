import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from 'react-native';

import { MATCHES_URL } from '../config';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { useFavorites } from '../hooks/useFavorites';

type Team = {
	id: string;
	name: string;
	city: string;
};

type Score = {
	home: number;
	away: number;
};

type Match = {
	id: string;
	startsAt: string | null;
	status: string;
	home: Team;
	away: Team;
	score: Score | null;
	minute?: number;
};

type MatchesResponse = {
	round: number;
	matches: Match[];
};

type Filter = 'all' | 'upcoming' | 'finished';

const FILTERS: { label: string; value: Filter }[] = [
	{ label: 'Все', value: 'all' },
	{ label: 'Предстоящие', value: 'upcoming' },
	{ label: 'Завершённые', value: 'finished' },
];

const STATUS_LABELS: Record<string, string> = {
	scheduled: 'Предстоящий',
	live: 'Идёт',
	finished: 'Завершён',
	postponed: 'Перенесён',
};

function formatDate(value: string | null): string {
	if (!value) {
		return 'Дата не определена';
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return 'Дата не определена';
	}

	return new Intl.DateTimeFormat('ru-RU', {
		day: 'numeric',
		month: 'long',
		hour: '2-digit',
		minute: '2-digit',
	}).format(date);
}

function MatchCard({
	match,
	isFavorite,
	onToggleFavorite,
}: {
	match: Match;
	isFavorite: boolean;
	onToggleFavorite: () => void;
}) {
	const statusLabel = STATUS_LABELS[match.status] ?? 'Статус неизвестен';

	return (
		<View style={styles.card}>
			<View style={styles.cardHeader}>
				<Text style={styles.date}>{formatDate(match.startsAt)}</Text>
				<FavoriteButton active={isFavorite} onPress={onToggleFavorite} />
			</View>

			<View style={styles.teams}>
				<View style={styles.team}>
					<Text style={styles.teamName}>{match.home.name}</Text>
					<Text style={styles.city}>{match.home.city}</Text>
				</View>

				<View style={styles.scoreContainer}>
					<Text style={styles.score}>
						{match.score
							? `${match.score.home} : ${match.score.away}`
							: '— : —'}
					</Text>
					<Text
						style={[
							styles.status,
							match.status === 'live' && styles.liveStatus,
						]}
					>
						{statusLabel}
						{match.status === 'live' && match.minute != null
							? ` · ${match.minute}'`
							: ''}
					</Text>
				</View>

				<View style={[styles.team, styles.awayTeam]}>
					<Text style={styles.teamName}>{match.away.name}</Text>
					<Text style={styles.city}>{match.away.city}</Text>
				</View>
			</View>
		</View>
	);
}

export function MatchesScreen() {
	const [matches, setMatches] = useState<Match[]>([]);
	const [round, setRound] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
	const [filter, setFilter] = useState<Filter>('all');

	const { isFavorite, toggle } = useFavorites();

	const loadMatches = useCallback(async (isRefresh = false) => {
		if (isRefresh) {
			setRefreshing(true);
		} else {
			setLoading(true);
		}

		setError(null);

		try {
			const response = await fetch(MATCHES_URL);

			if (!response.ok) {
				throw new Error(`Ошибка сервера: ${response.status}`);
			}

			const data: MatchesResponse = await response.json();

			if (!Array.isArray(data.matches)) {
				throw new Error('Некорректный формат данных матчей');
			}

			setMatches(data.matches);
			setRound(data.round);
			setUpdatedAt(new Date());
		} catch {
			setError(
				'Не удалось загрузить матчи. Проверьте соединение и попробуйте ещё раз.',
			);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		void loadMatches();
	}, [loadMatches]);

	const filteredMatches = useMemo(() => {
		switch (filter) {
			case 'upcoming':
				return matches.filter(match => match.status === 'scheduled');
			case 'finished':
				return matches.filter(match => match.status === 'finished');
			default:
				return matches;
		}
	}, [filter, matches]);

	const renderMatch = useCallback(
		({ item }: { item: Match }) => (
			<MatchCard
				match={item}
				isFavorite={isFavorite(item.id)}
				onToggleFavorite={() => toggle(item.id)}
			/>
		),
		[isFavorite, toggle],
	);

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size='large' color='#2563eb' />
				<Text style={styles.message}>Загружаем матчи…</Text>
			</View>
		);
	}

	if (error && matches.length === 0) {
		return (
			<View style={styles.centered}>
				<Text style={styles.message}>{error}</Text>
				<Pressable
					style={styles.primaryButton}
					onPress={() => void loadMatches()}
				>
					<Text style={styles.primaryButtonText}>Повторить</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.heading}>
				<View>
					<Text style={styles.title}>Матчи тура</Text>
					{round != null && <Text style={styles.subtitle}>Тур {round}</Text>}
				</View>

				<Pressable
					style={styles.refreshButton}
					onPress={() => void loadMatches(true)}
					disabled={refreshing}
				>
					<Text style={styles.refreshButtonText}>
						{refreshing ? 'Обновляем…' : 'Обновить'}
					</Text>
				</Pressable>
			</View>

			{updatedAt && <UpdatedAgo since={updatedAt} />}

			{error && (
				<Text style={styles.inlineError}>
					Не удалось обновить данные. Показаны последние загруженные матчи.
				</Text>
			)}

			<View style={styles.filters}>
				{FILTERS.map(item => {
					const selected = filter === item.value;

					return (
						<Pressable
							key={item.value}
							onPress={() => setFilter(item.value)}
							style={[styles.filterButton, selected && styles.selectedFilter]}
						>
							<Text
								style={[
									styles.filterText,
									selected && styles.selectedFilterText,
								]}
							>
								{item.label}
							</Text>
						</Pressable>
					);
				})}
			</View>

			<FlatList
				style={styles.list}
				data={filteredMatches}
				keyExtractor={item => item.id}
				renderItem={renderMatch}
				contentContainerStyle={
					filteredMatches.length === 0 ? styles.emptyList : styles.listContent
				}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => void loadMatches(true)}
					/>
				}
				ListEmptyComponent={
					<Text style={styles.emptyMessage}>
						{matches.length === 0
							? 'В этом туре пока нет матчей.'
							: 'В этой категории матчей нет.'}
					</Text>
				}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 8,
	},
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
		gap: 12,
	},
	heading: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#111827',
	},
	subtitle: {
		fontSize: 14,
		color: '#6b7280',
		marginTop: 2,
	},
	message: {
		fontSize: 15,
		color: '#374151',
		textAlign: 'center',
	},
	refreshButton: {
		backgroundColor: '#eff6ff',
		borderRadius: 8,
		paddingVertical: 9,
		paddingHorizontal: 12,
	},
	refreshButtonText: {
		color: '#1d4ed8',
		fontWeight: '600',
	},
	primaryButton: {
		backgroundColor: '#2563eb',
		borderRadius: 8,
		paddingVertical: 11,
		paddingHorizontal: 18,
	},
	primaryButtonText: {
		color: '#fff',
		fontWeight: '600',
	},
	inlineError: {
		color: '#b91c1c',
		fontSize: 13,
		marginTop: 8,
	},
	filters: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 16,
		marginBottom: 12,
	},
	filterButton: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 20,
		backgroundColor: '#f3f4f6',
	},
	selectedFilter: {
		backgroundColor: '#2563eb',
	},
	filterText: {
		color: '#374151',
		fontSize: 13,
		fontWeight: '500',
	},
	selectedFilterText: {
		color: '#fff',
	},
	list: {
		flex: 1,
	},
	listContent: {
		paddingBottom: 24,
	},
	emptyList: {
		flexGrow: 1,
		justifyContent: 'center',
		paddingBottom: 24,
	},
	emptyMessage: {
		color: '#6b7280',
		textAlign: 'center',
		fontSize: 15,
		padding: 24,
	},
	card: {
		backgroundColor: '#fff',
		borderColor: '#e5e7eb',
		borderWidth: 1,
		borderRadius: 12,
		padding: 14,
		marginBottom: 12,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	date: {
		color: '#6b7280',
		fontSize: 13,
	},
	teams: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	team: {
		flex: 1,
	},
	awayTeam: {
		alignItems: 'flex-end',
	},
	teamName: {
		color: '#111827',
		fontWeight: '600',
		fontSize: 15,
	},
	city: {
		color: '#9ca3af',
		fontSize: 12,
		marginTop: 3,
	},
	scoreContainer: {
		alignItems: 'center',
		minWidth: 72,
	},
	score: {
		color: '#111827',
		fontSize: 18,
		fontWeight: '700',
	},
	status: {
		color: '#6b7280',
		fontSize: 11,
		marginTop: 4,
		textAlign: 'center',
	},
	liveStatus: {
		color: '#dc2626',
		fontWeight: '700',
	},
});
