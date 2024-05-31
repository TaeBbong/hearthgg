// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rankdata.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$RankDataImpl _$$RankDataImplFromJson(Map<String, dynamic> json) =>
    _$RankDataImpl(
      accountid: json['accountid'] as String,
      rank: (json['rank'] as num).toInt(),
      rating: (json['rating'] as num?)?.toDouble(),
    );

Map<String, dynamic> _$$RankDataImplToJson(_$RankDataImpl instance) =>
    <String, dynamic>{
      'accountid': instance.accountid,
      'rank': instance.rank,
      'rating': instance.rating,
    };
