import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/home_controller.dart';
import '../services/main_service.dart';
import '../models/rankdata.dart';
import '../widgets/loading_indicator.dart';
import '../widgets/mode_indicator.dart';
import '../widgets/rank_card.dart';
import '../widgets/footer.dart';
import '../constants/area.dart';

class DesktopScreen extends GetView<HomeController> {
  DesktopScreen({super.key});

  final mainService = Get.find<MainService>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: InkWell(
          child: const Text('Hearth.gg'),
          onTap: () {},
        ),
        centerTitle: false,
        actions: [
          Switch(
            value: mainService.isDarkMode,
            onChanged: mainService.changeMode,
            activeColor: Colors.blue,
          ),
        ],
      ),
      body: GetBuilder<HomeController>(builder: (controller) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Padding(
              padding: EdgeInsets.all(20.0),
            ),
            const ModeIndicator(),
            SizedBox(
              width: MediaQuery.of(context).size.width * 0.4,
              child: Row(
                children: <Widget>[
                  Expanded(
                    flex: 2,
                    child: DropdownButtonHideUnderline(
                      child: DropdownButtonFormField<AreaLabel>(
                        value: controller.searchParams['area'],
                        items: AreaLabel.values
                            .map<DropdownMenuItem<AreaLabel>>(
                                (AreaLabel value) {
                          return DropdownMenuItem<AreaLabel>(
                            value: value,
                            child: Text(
                              value.text,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          );
                        }).toList(),
                        onChanged: (area) => controller.updateArea(area!),
                        isExpanded: true,
                        decoration: const InputDecoration(
                          enabledBorder: OutlineInputBorder(
                            borderSide:
                                BorderSide(color: Colors.grey, width: 1),
                          ),
                          border: OutlineInputBorder(),
                          filled: false,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 1,
                    child: DropdownButtonHideUnderline(
                      child: DropdownButtonFormField<int>(
                        value: mainService
                            .seasons[controller.selectedMode.code].last,
                        items: mainService.seasons[controller.selectedMode.code]
                            .map<DropdownMenuItem<int>>((int season) {
                          return DropdownMenuItem<int>(
                            value: season,
                            child: Text(
                              season.toString(),
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          );
                        }).toList(),
                        onChanged: (season) => controller.updateSeason(season!),
                        isExpanded: true,
                        decoration: const InputDecoration(
                          enabledBorder: OutlineInputBorder(
                            borderSide:
                                BorderSide(color: Colors.grey, width: 1),
                          ),
                          border: OutlineInputBorder(),
                          filled: false,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 5,
                    child: TextFormField(
                      controller: controller.battleTagController,
                      onFieldSubmitted: (_) async =>
                          await controller.performSearch(),
                      decoration: const InputDecoration(
                        hintText: '배틀태그를 입력하세요. (ex: Flurry)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.search),
                    onPressed: () async => await controller.performSearch(),
                  ),
                ],
              ),
            ),
            controller.isSearching
                ? const LoadingIndicator()
                : controller.isResult
                    ? SizedBox(
                        width: MediaQuery.of(context).size.width * 0.41,
                        child: RankCard(
                            rankData:
                                RankData.fromJson(controller.searchResult)),
                      )
                    : Container(),
            Expanded(child: Container()),
            Footer(),
          ],
        );
      }),
    );
  }
}
