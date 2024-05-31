// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'rankdata.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

RankData _$RankDataFromJson(Map<String, dynamic> json) {
  return _RankData.fromJson(json);
}

/// @nodoc
mixin _$RankData {
  String get accountid => throw _privateConstructorUsedError;
  int get rank => throw _privateConstructorUsedError;
  double? get rating => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $RankDataCopyWith<RankData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $RankDataCopyWith<$Res> {
  factory $RankDataCopyWith(RankData value, $Res Function(RankData) then) =
      _$RankDataCopyWithImpl<$Res, RankData>;
  @useResult
  $Res call({String accountid, int rank, double? rating});
}

/// @nodoc
class _$RankDataCopyWithImpl<$Res, $Val extends RankData>
    implements $RankDataCopyWith<$Res> {
  _$RankDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? accountid = null,
    Object? rank = null,
    Object? rating = freezed,
  }) {
    return _then(_value.copyWith(
      accountid: null == accountid
          ? _value.accountid
          : accountid // ignore: cast_nullable_to_non_nullable
              as String,
      rank: null == rank
          ? _value.rank
          : rank // ignore: cast_nullable_to_non_nullable
              as int,
      rating: freezed == rating
          ? _value.rating
          : rating // ignore: cast_nullable_to_non_nullable
              as double?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$RankDataImplCopyWith<$Res>
    implements $RankDataCopyWith<$Res> {
  factory _$$RankDataImplCopyWith(
          _$RankDataImpl value, $Res Function(_$RankDataImpl) then) =
      __$$RankDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String accountid, int rank, double? rating});
}

/// @nodoc
class __$$RankDataImplCopyWithImpl<$Res>
    extends _$RankDataCopyWithImpl<$Res, _$RankDataImpl>
    implements _$$RankDataImplCopyWith<$Res> {
  __$$RankDataImplCopyWithImpl(
      _$RankDataImpl _value, $Res Function(_$RankDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? accountid = null,
    Object? rank = null,
    Object? rating = freezed,
  }) {
    return _then(_$RankDataImpl(
      accountid: null == accountid
          ? _value.accountid
          : accountid // ignore: cast_nullable_to_non_nullable
              as String,
      rank: null == rank
          ? _value.rank
          : rank // ignore: cast_nullable_to_non_nullable
              as int,
      rating: freezed == rating
          ? _value.rating
          : rating // ignore: cast_nullable_to_non_nullable
              as double?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$RankDataImpl implements _RankData {
  _$RankDataImpl({required this.accountid, required this.rank, this.rating});

  factory _$RankDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$RankDataImplFromJson(json);

  @override
  final String accountid;
  @override
  final int rank;
  @override
  final double? rating;

  @override
  String toString() {
    return 'RankData(accountid: $accountid, rank: $rank, rating: $rating)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$RankDataImpl &&
            (identical(other.accountid, accountid) ||
                other.accountid == accountid) &&
            (identical(other.rank, rank) || other.rank == rank) &&
            (identical(other.rating, rating) || other.rating == rating));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, accountid, rank, rating);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$RankDataImplCopyWith<_$RankDataImpl> get copyWith =>
      __$$RankDataImplCopyWithImpl<_$RankDataImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$RankDataImplToJson(
      this,
    );
  }
}

abstract class _RankData implements RankData {
  factory _RankData(
      {required final String accountid,
      required final int rank,
      final double? rating}) = _$RankDataImpl;

  factory _RankData.fromJson(Map<String, dynamic> json) =
      _$RankDataImpl.fromJson;

  @override
  String get accountid;
  @override
  int get rank;
  @override
  double? get rating;
  @override
  @JsonKey(ignore: true)
  _$$RankDataImplCopyWith<_$RankDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
