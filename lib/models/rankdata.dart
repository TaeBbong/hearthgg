import 'package:freezed_annotation/freezed_annotation.dart';

part 'rankdata.freezed.dart';
part 'rankdata.g.dart';

@freezed
class RankData with _$RankData {
  factory RankData({
    required String accountid,
    required int rank,
    double? rating,
  }) = _RankData;

  factory RankData.fromJson(Map<String, dynamic> json) =>
      _$RankDataFromJson(json);
}
